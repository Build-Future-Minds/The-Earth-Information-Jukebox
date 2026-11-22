# Media on Home

| File | What it is |
| --- | --- |
| `earth-sonata-30s.mp4` | The team's 30-second demo video, shown on Home under "See it in 30 seconds" |
| `earth-sonata-30s-poster.jpg` | Its poster: the frame at 4.2 s ("Can we hear one?") |

## Where the video comes from

The video is the real Earth Sonata app, recorded and cut by code. Nothing in it was made by a
generative AI model.

- **Picture:** a Playwright recording of the production build of the app (Home, then Compare,
  driven with Enter and Tab), framed and captioned with Remotion. The NASA picture is Global Sea
  Surface Currents and Temperature (NASA SVS 3912, ECCO2 model output). Credit: NASA/Goddard
  Space Flight Center Scientific Visualization Studio.
- **Sound:** the app's own rhythm, captured inside the browser, mixed with ffmpeg under a human
  narration. The captions are the narration's words.
- **What Home shows** is the designed film with voice (version 1, the rhythm cut, made 15 Nov
  2026). The source project lives outside this repository, in its own folder. Its README explains
  how to record and render it again.

The transcript on Home (`VIDEO_MOMENTS` in `web/src/views/HomeView.tsx`) describes each moment.
Its pulse gaps were read from the recording: Region A 0.73 s and 0.27 s, Region B 0.58 s and
0.42 s.

## How the file was made smaller for the web

The rendered film is 39 MB (1920 × 1080, about 10 Mbps). For the site it was re-encoded at the
same size and length (29.9 s), to 8.1 MB:

```
ffmpeg -i earth-sonata-30s.mp4 -c:v libx264 -preset slow -crf 26 -pix_fmt yuv420p -profile:v high \
  -c:a aac -b:a 128k -movflags +faststart earth-sonata-30s.mp4
ffmpeg -ss 4.2 -i earth-sonata-30s.mp4 -frames:v 1 -vf scale=1280:-2 -q:v 4 earth-sonata-30s-poster.jpg
```

`+faststart` lets the browser start playing before the whole file arrives. Text in the captions
and the app still reads the same as the 39 MB file at this setting.

## Rules

- Home never plays it on its own: no `autoplay`, `loop` or `muted`. Esc pauses it.
- Replace it only with a video made the same way (the real app, no generative AI), and update the
  transcript, this file and the browser tests in `web/e2e/home.e2e.ts` with it.
