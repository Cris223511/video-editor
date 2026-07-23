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

Video Editor builds a video from start to finish in the browser. You import, cut, grade color, censor moving subjects, add text, images, shapes and audio, and export the finished file. All processing happens on your device.

| | |
| --- | --- |
| **No install** | Opens in the browser, no downloads or permissions. |
| **Private** | No frame is uploaded to any server. |
| **Free and open** | MIT license, no watermarks or paid features. |
| **Everyday jobs** | A quick cut with music, a vertical clip, a tutorial, hiding a face or a plate. |

## What you can do

| Area | Summary |
| --- | --- |
| **Import** | Video (MP4, WebM, MOV, MKV, M4V, OGV, up to 1.5 GB), images (PNG, JPG, WebP, GIF, AVIF and more) and audio (MP3, WAV, OGG, M4A, FLAC, OPUS…). Type, size and real binary signature are validated, not just the extension. |
| **Timeline** | Up to six video levels plus dedicated lanes for text and shapes, images and audio. Each lane with several rows, adjustable height and an editable name. Non-destructive trimming, split at the playhead, snapping, speed from 0.25x to 4x and gap closing. |
| **Transitions** | Twenty-one transitions across five families, for clips and for any element (text, shape, image, drawing). Duration editable right on the timeline. |
| **Color** | Three tonal-zone wheels, four per-channel curves and exposure, contrast, saturation, temperature and tint. On clips and images. |
| **Effects** | Motion blur and a per-clip effect chain, with the option to have color and effects fade in gradually. |
| **Motion censoring** | Circle, rectangle or free brush; pixelate, blur or full cover; a path recorded with the cursor and editable node by node, with slow motion while recording. |
| **Layers** | Text with font, outline, shadow and neon; images with crop and color; shapes; freehand drawing; and ten decorative canvas frames. |
| **Audio** | Master volume, volume regions per range and splitting a video's audio to its own track. |
| **Canvas** | Six aspect ratios or automatic fit, with band fill by color or by the video itself scaled up and blurred. |
| **Export** | In-browser render at 24, 30 or 60 fps, MP4 (H.264/AAC) with a WebM fallback, with progress and cancel. |
| **Projects** | Automatic in-browser saving with the videos included, a searchable paginated list, and export to a `.veproj` file. |

### Details that make the difference

- **What you see is what you export.** The viewer and the exporter share the same color, transition and compositing engine, so the final file matches your edit.
- **Transitions for any element.** A title or an image enters with the same gallery as clips, with its own duration and its wedge on the timeline.
- **Motion on any layer.** The cursor-recorded path is not only for censoring: text, images, shapes and drawings animate with the same controls.
- **Zoom in the viewer.** Hold Ctrl and scroll to zoom in around the cursor, to place a small censor or text precisely.
- **Effortless saving.** Every change is saved on its own about a second later, videos included, without leaving your device.

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

Requires **Node.js 18** or newer.

```bash
npm install
npm run dev
```

Vite serves the app at `http://localhost:5173`.

| Command | What it does |
| --- | --- |
| `npm run dev` | Development server with hot reload. |
| `npm run build` | Type-checks and builds the production output in `dist`. |
| `npm run preview` | Serves the build locally. |

## Tech stack

| Component | Tool |
| --- | --- |
| UI | [React 18](https://react.dev/) and [TypeScript 5](https://www.typescriptlang.org/) |
| Bundler | [Vite 5](https://vite.dev/) |
| Styles | [Tailwind CSS](https://tailwindcss.com/) |
| State | [Zustand](https://zustand-demo.pmnd.rs/) |
| Routing | [React Router](https://reactrouter.com/) |
| Animation | [Framer Motion](https://www.framer.com/motion/) and [Lenis](https://lenis.darkroom.engineering/) |
| Components | [Radix UI](https://www.radix-ui.com/), [Embla](https://www.embla-carousel.com/), [react-resizable-panels](https://github.com/bvaughn/react-resizable-panels) |
| Export | Canvas, Web Audio and MediaRecorder |
| Storage | IndexedDB |

The editing engine (validation, media, color, transitions, compositor and export) lives in `src/lib`, separate from the UI, so the logic does not depend on React.

## Privacy

> Your videos are processed entirely on your device. Nothing is uploaded to any server, while editing or exporting. There are no accounts, no tracking and no analytics. Saved projects live in your browser's storage, and deleting them from the app removes them for real.

## License

**MIT** © [Cris223511](https://github.com/Cris223511). Full text in [LICENSE](LICENSE).
