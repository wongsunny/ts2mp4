import * as https from 'https'
import * as fs from 'fs-extra'
import * as path from 'path'
import * as child_process from 'child_process'
const debug = false

var myLog = (message?: any, ...optionalParams: any[]) => {
    debug && console.log(message, ...optionalParams)
}
var myError = (message?: any, ...optionalParams: any[]) => {
    debug && console.error(message, ...optionalParams)
}

console.log('是否开启debug模式:', debug)

class Ts2Mp4Helper {
    private m3u8Url: string //m3u8文件路径
    private hostname: string //主机名
    private mp4Name: string //合成的MP4文件所在路径

    //保存路径
    private m3u8SavePath: string
    private mp4SavePath: string
    private tsSavePath: string
    private ffmpegConfigSavePath: string

    private tsParentPaths: string[] = []//ts可能存在的目录

    constructor(m3u8Url: string, mp4Name: string, hostname?: string) {
        this.m3u8Url = m3u8Url
        this.mp4Name = mp4Name
        this.hostname = hostname

        this.m3u8SavePath = `./res/m3u8/${mp4Name}.m3u8`
        this.mp4SavePath = `./res/mp4/${mp4Name}.mp4`
        this.tsSavePath = `../ts/${mp4Name}` //ts数据存放在工程外面 ts文件和ts脚本冲突 编辑器很卡顿
        this.ffmpegConfigSavePath = `${this.tsSavePath}/${mp4Name}.txt`

        let dirs = ['./res/m3u8', './res/mp4', `../ts/${mp4Name}`]
        for (const dir of dirs) {
            if (!fs.existsSync(dir)) {
                fs.mkdirpSync(dir)
            }
        }

        //通常情况ts和m3u8在同一目录目录下
        //https://yushou.qitu-zuida.com/20180716/9370_8a4932d6/800k/hls/9524bf9ffe9000.ts
        //https://yushou.qitu-zuida.com/20180716/9370_8a4932d6/800k/hls/index.m3u8
        let paths = this.m3u8Url.split('/')
        paths.pop()
        let path1 = paths.join('/')
        this.tsParentPaths.push(path1)
        //也可能在hostname目录下
        if (this.hostname && this.hostname != '') {
            this.tsParentPaths.push(this.hostname)
        }

    }

    async ts2Mp4() {
        myLog('开始下载:', this.mp4Name)
        if (fs.existsSync(this.mp4SavePath)) {
            myLog('该视频已存在,跳过合成', this.mp4SavePath)
            return Promise.resolve(this.mp4SavePath)
        }
        //下注 .m3u8
        await this.downloadM3u8File()
        //从m3u8文件中解析出所有ts片段
        let tsList = this.analyzeM3u8()
        //下注所有ts片段
        let successTsList = await this.downloadTsList(tsList)
        //生成FFmpeg配置文件
        this.createFfmpegConfig(successTsList)
        return this.useFfmpegCompoundMp4()
    }



    private https_request(url: string, savePath: string): Promise<string> {
        let tempArr = url.split('//')[1].split('/')
        let hostname = tempArr.shift()
        let path1 = '/' + tempArr.join('/')
        let options = {
            hostname: hostname,
            path: path1,
            method: 'GET',
            headers: {
                'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/75.0.3770.100 Safari/537.36',
            }
        }

        let timeoutPromise = () => {
            return new Promise((resolve, reject) => {
                setTimeout(() => {
                    return resolve('timeout')
                }, 30 * 1000);
            }) as Promise<string>
        }

        let requestPromise = (options, savePath) => {
            return new Promise((resolve, reject) => {
                let client = https.request(options, (res) => {
                    if (res.statusCode == 200) {
                        let oStream = fs.createWriteStream(savePath)
                        res.pipe(oStream)
                        oStream.on('open', () => {
                            myLog('文件开始写入')
                        })
                        oStream.on('close', () => {
                            myLog('写入完成', url)
                            return resolve(savePath)
                        })
                    } else {
                        myError('https返回状态错误', res.statusCode, this.mp4Name)
                        return reject(savePath)
                    }
                })
                client.on('error', (e) => {
                    myError('https 请求失败了', e);
                    return reject(savePath)
                })
                client.end()
            }) as Promise<string>
        }

        return Promise.race([timeoutPromise(), requestPromise(options, savePath)])
    }

    /**
     * https 请求可设置重新请求次数
     * @param url 
     * @param savePath 
     * @param connectCount 重新连接次数
     */
    private https_request_byCount(url: string, savePath: string, connectCount: number): Promise<string> {
        return this.https_request(url, savePath)
            .then((data) => {
                if (data == 'timeout' && connectCount > 0) {
                    myLog('请求超时了,重新请求')
                    return this.https_request_byCount(url, savePath, --connectCount)
                }
                return Promise.resolve(data)
            })
    }


    /**
     * 下载m3u8文件
     */
    private async downloadM3u8File() {
        myLog('下载m3u8文件', this.m3u8Url)
        if (fs.existsSync(this.m3u8SavePath)) {
            myLog('已经存在m3u8文件,跳过下载', this.m3u8SavePath)
            return
        }
        try {
            await this.https_request_byCount(this.m3u8Url, this.m3u8SavePath, 1)
        } catch (error) {
            myError('下载m3u8文件失败了', this.m3u8SavePath)
        }
    }

    /**
     *下载所有ts片段 
     */
    private async downloadTsList(tsList: string[]): Promise<string[]> {
        myLog('下载所有ts片段 ')
        let successList: string[] = []
        outter:
        for (const ts of tsList) {
            inner:
            for (const tsParentPath of this.tsParentPaths) {
                let tsUrl = ''
                if (ts.substring(0, 1) != '/') {
                    tsUrl = `${tsParentPath}/${ts}`
                } else {
                    tsUrl = `${tsParentPath}${ts}`
                }
                let tsName = ts
                if (ts.split('/').length) {
                    tsName = ts.split('/').pop()
                }
                let tsSavePath = `${this.tsSavePath}/${tsName}`
                if (fs.existsSync(tsSavePath)) {
                    myLog('ts文件已经存在了,跳过下载', tsSavePath)
                    successList.push(ts)
                    continue outter;
                }
                try {
                    await this.https_request_byCount(tsUrl, tsSavePath, 2)
                    //如果在第一个路径下找到了 就不访问第二个路径了
                    successList.push(ts)
                    continue inner;
                } catch (error) {
                    myError('请求下载ts片段出错了', tsUrl)
                }
            }
        }
        return successList
    }

    /**
     * 解析 .m3u8文件找出所有ts视频片段 
     */
    private analyzeM3u8() {
        myLog('解析 .m3u8文件找出所有ts视频片段  ')
        let content = fs.readFileSync(this.m3u8SavePath, { encoding: 'utf8' })
        let rows = content.split('\n')
        rows = rows.filter((item) => {
            return item.match(/\.ts$/);
        });
        return rows
    }

    /**
     * 生成ffmpg批量合成的配置文件
     * @tsList 所有ts片段
     * 注:ffmpg不支持路径配置 需要和ts在同一个目录下
     */
    private createFfmpegConfig(tsList: string[]) {
        myLog(' 生成ffmpg批量合成的配置文件')
        let row_1 = 'ffconcat version 1.0\n'
        let content = row_1
        for (let ts of tsList) {
            //m3u8中可能是相当于hostname的路径名
            let tempArr = ts.split('/')
            if (tempArr.length > 0) {
                ts = tempArr.pop()
            }
            let fullPath = `${this.tsSavePath}/${ts}`
            if (this.checkTsFormat(fullPath)) {
                //格式正确才参与MP4的合成
                content += `file\t${ts}\n`
            } else {
                myError('ts格式错误!', fullPath)
            }
        }
        fs.writeFileSync(this.ffmpegConfigSavePath, content)
    }

    /**
     * 检查视频格式是否为ts
     * 0x47 只检查一个字节
     */
    private checkTsFormat(fullPath: string) {
        let buf = fs.readFileSync(fullPath)
        return buf.length && buf.readInt8(0) == 0x47
    }

    /**
     * 使用FFmpeg合成MP4
     * ffmpeg -i input.txt -acodec copy -vcodec copy -absf aac_adtstoasc ${resultFile}
     */
    private useFfmpegCompoundMp4(): Promise<string> {
        myLog(' 使用FFmpeg合成MP4')
        return new Promise((resolve, reject) => {
            let ls = child_process.spawn(
                'ffmpeg',
                [
                    '-i',
                    this.ffmpegConfigSavePath,
                    '-acodec',
                    'copy',
                    '-vcodec',
                    'copy',
                    '-absf',
                    'aac_adtstoasc',
                    this.mp4SavePath
                ])

            ls.stdout.on('data', (data) => {
                myLog(`FFmpeg msg: ${data}`);
            });

            ls.on('close', (code) => {
                //myLog(`子进程使用代码 ${code} 关闭所有 stdio`);
            });

            ls.on('exit', (code) => {
                if (code == 0) {
                    myLog(`FFmpeg合成完成 退出码:${code}`);
                    return resolve(this.mp4SavePath)
                } else {
                    myLog(`FFmpeg合成失败了 退出码:${code}`);
                    return reject(this.mp4SavePath)
                }
            });
        })
    }


}


export { Ts2Mp4Helper }
