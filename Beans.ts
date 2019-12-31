/**
 * 下载配置
 */
interface ts2Mp4Info {
    m3u8Url: string, //要下在视频对用的m3u8
    mp4Name: string, //保存mp4使用的名字
    hostname?: string //请求的主机名 当ts和m3u8不在同一目录下时使用
}

export { ts2Mp4Info }