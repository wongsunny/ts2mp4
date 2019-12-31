import *as fs from "fs-extra";
import { ts2Mp4Info } from "./Beans";
import { Ts2Mp4Helper } from "./Ts2Mp4Helper";

function main() {
    let content = fs.readFileSync('./Config.json', { encoding: 'utf8' })
    let objs: ts2Mp4Info[] = JSON.parse(content)['list']

    // for (const obj of objs) {
    //     try {
    //         await new Ts2Mp4Helper(obj.m3u8Url, obj.mp4Name, obj['hostname'])
    //             .ts2Mp4()
    //     } catch (e) {
    //         console.log('合成mp4视频出错了', e)
    //     }
    // }
    //多线程同步执行
    let promiseList: Promise<string>[] = []
    for (const obj of objs) {
        let promise = new Ts2Mp4Helper(obj.m3u8Url, obj.mp4Name, obj['hostname'])
            .ts2Mp4()
        promiseList.push(promise)
    }
    Promise.all(promiseList)
        .then((data: string[]) => {
            console.log('批量合成视频成功的列表:', data)
        })
        .catch(e => {
            console.log('批量合成视频失败!', e)
        })
}
// //任务分租
// function groupTasks(tasks: Promise<string>[]) {
//     let max = 10
//     let taskGroups: Promise<string>[][] = []
//     if (tasks.length <= max) {
//         taskGroups.push(tasks)
//         console.log('下载数量少分成一组,即可')
//     } else {
//         let currIndex = 0
//         for (let index = 0; index < tasks.length; index++) {
//             let task = tasks[index];
//             if (condition) {
//                 let oneGroup = tasks.slice(currIndex, max)
//                 currIndex += 10
//                 max += oneGroup.length
//             }
//         }
//     }
// }

main()


