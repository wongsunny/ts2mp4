import *as fs from "fs-extra";
import { ts2Mp4Info } from "./Beans";
import { Ts2Mp4Helper } from "./Ts2Mp4Helper";

async function main() {
    let content = fs.readFileSync('./Config.json', { encoding: 'utf8' })
    let objs: ts2Mp4Info[] = JSON.parse(content)['list']
    for (const obj of objs) {
        try {
            await new Ts2Mp4Helper(obj.m3u8Url, obj.mp4Name, obj['hostname'])
                .ts2Mp4()
        } catch (e) {
            console.log('合成mp4视频出错了', e)
        }
    }
}
main()


