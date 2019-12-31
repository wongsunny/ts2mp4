/**
 * 下载配置
 */
interface Ts2Mp4Info {
    m3u8Url: string, //要下在视频对用的m3u8
    mp4Name: string, //保存mp4使用的名字
    hostname?: string //请求的主机名 当ts和m3u8不在同一目录下时使用
}

interface ConfigInfo {
    parallelMax: number
    list: Ts2Mp4Info[]
}
export { Ts2Mp4Info, ConfigInfo }
