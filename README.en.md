<p align="center">
  <img src="public/logo.png" alt="Video Editor logo" width="110">
</p>

<h1 align="center">Video Editor</h1>

<p align="center">
  A full video editor that runs entirely in your browser.<br>
  No installs, no accounts, and your files never leave your device.
</p>

<p align="center">
  <a href="README.md">Español</a> · <a href="README.en.md">English</a>
</p>

<p align="center">
  <a href="https://github.com/Cris223511/video-editor/releases/latest"><img src="https://img.shields.io/github/v/release/Cris223511/video-editor?label=version&color=1861ff" alt="latest version"></a>
  <img src="https://img.shields.io/badge/React-18-1861ff" alt="react 18">
  <img src="https://img.shields.io/badge/TypeScript-5-1861ff" alt="typescript 5">
  <img src="https://img.shields.io/badge/Vite-5-1861ff" alt="vite 5">
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-green" alt="MIT license"></a>
</p>

<p align="center">
  <b><a href="https://video-editor-plus.vercel.app">Open the app</a></b>
</p>

---

## What it is

Video Editor builds a video from start to finish in the browser. You import the files, cut and arrange the clips, grade color, censor moving subjects, add text, images, shapes and audio, and export the result. All processing happens on your device: no frame is uploaded to any server.

It is meant to solve a specific video the same day, a quick cut with music, a vertical piece for social, a screen tutorial or an interview where a face needs hiding. It does not replace a desktop suite; it handles everyday work and keeps it direct, with no installs, no accounts, no watermarks and no paid features.

## Features

**Import.** Video in MP4, WebM, MOV, MKV, M4V and OGV up to 1.5 GB, images in PNG, JPG, WebP, GIF, AVIF and more, and audio in MP3, WAV, OGG, M4A, FLAC or OPUS. Before adding a file, its type, size and real binary signature are checked, not just the extension.

**Timeline.** Up to six video levels plus dedicated lanes for text and shapes, images and audio. Each lane has several rows, an adjustable height by dragging its edge and an editable name. Trimming is non-destructive, clips split at the playhead, snap to each other, run from 0.25x to 4x and close the gaps left when you delete.

**Transitions.** Twenty-one across five families: fades, wipes, shapes, pushes and zooms. They work for clips and for any standalone element too, a text, a shape, an image or a drawing enters with the one you pick. Duration is set right on the timeline by dragging the entry wedge.

**Color.** Three tonal-zone wheels for shadows, midtones and highlights, four per-channel curves and the exposure, contrast, saturation, temperature and tint adjustments. It works on video clips and on images, and the correction can fade in instead of being full from the first frame.

**Motion censoring.** Circle, rectangle or free brush, with pixelation, blur or full cover. The path is recorded by dragging the element over the video, with slow motion to follow something fast, then corrected node by node. The same motion applies to text, images, shapes and drawings.

**Layers.** Text with its own fonts, outline, shadow, background and neon; images with crop and color; geometric shapes; freehand drawing; and ten decorative frames around the canvas.

**Audio.** Master project volume, volume regions per range to lower the music where someone speaks, and splitting a video's audio to its own track.

**Canvas and export.** Six aspect ratios or automatic fit to the first video, with band fill by color or by the video itself scaled up and blurred. Export happens in the browser at 24, 30 or 60 fps, in MP4 with a WebM fallback, with progress and cancel.

**Projects.** They save themselves in the browser with the videos inside, list with search and pagination, and can be packed into a `.veproj` file to move to another machine.

One idea runs through the whole editor: what you see is what you export. The viewer and the compositor share the same color, transition and render engine, so the final file matches your edit. And with Ctrl and the mouse wheel you zoom into the viewer, anchored to the cursor, to place a small censor or text precisely.

## Keyboard shortcuts

| Action | Shortcut |
| --- | --- |
| Play or pause | `Space` |
| Split at the playhead | `S` |
| Delete the selection | `Delete` or `Backspace` |
| Copy and paste | `Ctrl+C` and `Ctrl+V` |
| Undo and redo | `Ctrl+Z` and `Ctrl+Y` |
| Move the playhead one frame | `←` and `→` |
| Move the playhead one second | `Shift` + `←` or `→` |
| Jump to start or end | `Home` and `End` |
| Zoom the timeline | `+` and `-` |
| Zoom the viewer around the cursor | `Ctrl` + scroll |
| Clear the selection | `Esc` |

There is no save shortcut because the project saves itself. While typing in a field, shortcuts do not fire. With a censor selected, the arrows adjust its box instead of moving the playhead.

## Run locally

Requires Node.js 18 or newer.

```bash
npm install
npm run dev
```

Vite serves the app at `http://localhost:5173`. To build the production output into `dist` use `npm run build`, which also type-checks, and `npm run preview` serves that build locally.

## How it is built

The UI is React 18 with TypeScript, bundled with Vite and styled with Tailwind. State lives in Zustand and routing in React Router, with Framer Motion and Lenis for motion. Dialogs, menus and resizable panels rely on Radix, Embla and react-resizable-panels.

Rendering and recording use Canvas, Web Audio and MediaRecorder, and saved projects go to IndexedDB. The whole editing engine (validation, media analysis, color, transitions, compositor and export) lives in `src/lib`, separate from the UI, so the logic does not depend on React.

<details>
<summary>Project structure</summary>

```
video-editor/
├── index.html
├── vite.config.ts            COOP/COEP headers in case WebCodecs is used later
├── vercel.json               the same headers in production
└── src/
    ├── main.tsx              entry point
    ├── rutasDef.ts           all routes in one place
    ├── config/               version, limits and accepted formats
    ├── types/                domain types
    ├── lib/                  engine with no react dependency
    │   ├── validation/       file validation (type, size, signature)
    │   ├── media/            video analysis and thumbnails
    │   ├── layers/           layers, motion and geometry
    │   ├── color/            wheels, curves and tone adjustments
    │   ├── transiciones/     catalog, engine and element entrance
    │   ├── audio/            per-region gain
    │   ├── timeline/         timeline calculations
    │   ├── proyecto/         store, packaging and session
    │   └── export/           compositor and export
    ├── store/                global state
    ├── components/           icons, controls, site pieces and layout
    └── features/             site, import, projects and editor
```

</details>

## Privacy

> Your videos are processed entirely on your device. Nothing is uploaded to any server, while editing or exporting. There are no accounts, no tracking and no analytics. Saved projects live in your browser's storage, and deleting them from the app removes them for real.

## Contributing

Bug reports and ideas are welcome in the [issues](https://github.com/Cris223511/video-editor/issues). To contribute code, open a *pull request*. The project runs with `npm install` and `npm run dev`, with no extra setup.

## License

**MIT** © [Cris223511](https://github.com/Cris223511). Full text in [LICENSE](LICENSE).
