## 下载ts视频流合成mp4格式

### 安装FFmpeg
1. 安装FFmpeg http://ffmpeg.org/
2. 配置FFmpeg 配置环境变量 path路径配置到FFmpeg.exe
3. 确保 cmd ffmpeg 可以使用

### ./Config.json配置.m3u8

```
/**
 * 下载配置
 */
interface ts2Mp4Info {
    m3u8Url: string, //要下在视频对用的m3u8的url
    mp4Name: string, //保存mp4使用的名字
    hostname?: string //请求的主机名 当ts和m3u8不在同一目录下时使用
}
```

### 运行ts-node ./index.ts即可
合成后的视频在 ./res/mp4路径下