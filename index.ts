import * as fs from "fs-extra";
import { Ts2Mp4Info, ConfigInfo } from "./Beans";
import { Ts2Mp4Helper } from "./Ts2Mp4Helper";

async function main() {
    let content = fs.readFileSync('./Config.json', { encoding: 'utf8' })
    let configInfo: ConfigInfo = JSON.parse(content)
    let parallelMax = configInfo.parallelMax //最大并行下载数量
    let taskList = configInfo.list
    let taskGroups = groupTasks(taskList, parallelMax)
    let successList: string[] = []
    let errorList: string[] = []


    let index = 0
    for (const group of taskGroups) {
        let promiseList: Promise<string>[] = []
        for (const task of group) {
            let promise = new Ts2Mp4Helper(task.m3u8Url, task.mp4Name, task['hostname'])
                .ts2Mp4()
            promiseList.push(promise)
        }
        console.log(`第${index}组开始执行`)
        await Promise.all(promiseList).then((data: string[]) => {
            console.log(`第${index}组任务完成`, data)
            successList = successList.concat(data)
        })
            .catch(e => {
                console.error(`第${index}组任务失败信息`, e)
                errorList.push(e)
            })
        console.log(`第${index}组执行完成`)
        index++;
    }
    console.log('下载总结:')
    console.log('下载完成的视频', successList)
    console.log('出错日志:', errorList)
}
//任务分租
function groupTasks(tasks: Ts2Mp4Info[], parallelMax: number) {
    let taskGroups: Ts2Mp4Info[][] = []
    if (tasks.length <= parallelMax) {
        taskGroups.push(tasks)
        console.log('下载数量少分成一组即可')
    } else {
        let oneGroup = []
        for (let index = 0; index < tasks.length; index++) {
            let task = tasks[index];
            oneGroup.push(task)
            if (oneGroup.length >= parallelMax) {
                taskGroups.push(oneGroup.slice())
                oneGroup = []
            }
        }
        if (oneGroup.length > 0) {
            taskGroups.push(oneGroup)
        }
    }
    console.log('下载任务分组,一共有:', taskGroups.length)
    return taskGroups
}

main()

