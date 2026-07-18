<p align="center">
  <img src="public/logo.png" alt="Video Editor logo" width="120">
</p>

<h1 align="center">Video Editor</h1>

<p align="center">
  <b>A video editor that runs entirely in the browser.</b> Trim and join clips, add text, images, shapes
  and motion censorship, adjust the color tone and export without losing quality or frames.
  <i>No installation, and your videos never leave your computer.</i>
</p>

<p align="center">
  <a href="README.md">Español</a> · <a href="README.en.md">English</a>
</p>

<p align="center">
  <a href="https://github.com/Cris223511/video-editor/releases/latest"><img src="https://img.shields.io/github/v/release/Cris223511/video-editor?label=release&color=1861ff" alt="latest release"></a>
  <img src="https://img.shields.io/badge/React-18-1861ff" alt="react 18">
  <img src="https://img.shields.io/badge/TypeScript-5-1861ff" alt="typescript 5">
  <img src="https://img.shields.io/badge/Vite-5-1861ff" alt="vite 5">
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-green" alt="MIT license"></a>
</p>

---

## Live demo

Video Editor runs **right in the browser**, with no installation. The production version, deployed on Vercel, lives here:

| Version | Link | Status |
| ------- | ---- | ------ |
| 0.1.0 | _pending deployment_ | Coming soon |

> Once it is online, the link will appear in this table and you will be able to try it with a single click. What changed in each version is in the [changelog](CHANGELOG.md).

## Why

Editing a short video **should not** force you to install a heavy program, create an account or upload your material to someone else's cloud. Desktop tools are powerful, but they take up gigabytes and are hard to learn; web ones usually ask for a subscription, add a watermark or process the videos on their servers.

Video Editor does **all the work inside the browser**: you import, edit and export without a single frame leaving your computer. It is free, open source and *with no hidden paid features*.

> Actively in development. The full import, edit and export flow already works, and it is polished little by little.

## Features

### Import and media

- **Validated import.** You drag or pick videos and images, and before they join the project their *type, size and real signature* are checked, not just the extension.
- **Media library.** Imported files stay on the side, ready to bring onto the timeline when you need them.

### Timeline

- **Video clips.** Trim, join and reorder clips on the track. The `S` key splits the clip at the playhead.
- **Transitions** between clips, so the cut is not abrupt.
- **Layers and audio on their own track.** Each element has its block and its *time range*, so it appears and disappears when it should.

### Layers and annotations

- **Text** with a full editor: font, size, color, alignment and more.
- **Images and logos** on top, with adjustable **opacity**.
- **Shapes** with an option for *blurred blocks*.
- **Frame** decoration around the video.
- **Canvas and background** editable when the video does not fill the whole frame.

### Motion censorship

- **Censorship that follows the object.** Pixelate, blur, transparency or masks that move with **keyframes**, to cover a face or a plate *even as they move across the scene*.

### Video adjustments

- **Speed** of the clip, to speed it up or slow it down.
- **Tone** like a color correction: exposure, contrast, temperature and saturation.
- **Audio.** Mute a track or raise the volume *up to 200 %*.

### Export

- **Export inside the browser.** The project plays back drawing each frame onto a canvas at the chosen resolution, the audio is mixed and everything is recorded together at a high bitrate. **Resolution and FPS are preserved**, and the audio stays in sync. Because it happens in real time, a one-minute video takes about a minute to export.

### Interface

- **Light and dark theme,** with dark mode by default.
- **Contextual options panel** on the left: each tool shows only its own controls.
- **Everything local:** *no accounts, no watermarks, no paid features.*

## Keyboard shortcuts

| Action | Shortcut |
| ------ | -------- |
| Play or pause | `Spacebar` |
| Split at the playhead | `S` |
| Delete the selection (clip, layer or audio region) | `Del` or `Backspace` |

## Running locally

You only need **Node.js 18** or later.

```
npm install
npm run dev
```

Vite serves the app at `http://localhost:5173`.

## Commands

| Command | What it does |
| ------- | ------------ |
| `npm run dev` | Development server with hot reload. |
| `npm run build` | Type-checks and builds the production version into `dist`. |
| `npm run preview` | Serves the build result locally. |

## Technology

| Component | Tool | What it is used for |
| --------- | ---- | ------------------- |
| Interface | [React 18](https://react.dev/) and [TypeScript](https://www.typescriptlang.org/) | The app and its components, strictly typed |
| Bundling | [Vite](https://vite.dev/) | Development server and production build |
| Styles | [Tailwind CSS](https://tailwindcss.com/) | The design and the light or dark theme |
| State | [Zustand](https://zustand-demo.pmnd.rs/) | The project, editor and view state |
| Export | Canvas, Web Audio and MediaRecorder | Video render and recording, all in the browser |

The editing engine (validation, media analysis, render and export) lives in `src/lib`, **separate from the interface** in `src/components` and `src/features`, so the logic does not depend on React.

## Project structure

```
video-editor/
├── index.html
├── vite.config.ts            COOP/COEP headers in case WebCodecs is used later
├── vercel.json               the same headers in production
├── tailwind.config.js
└── src/
    ├── main.tsx              entry point
    ├── App.tsx               root and view decision (import or editor)
    ├── index.css             theme tokens and base styles
    ├── config/               limits and accepted formats
    ├── types/                domain types (media, layers, audio, frame, time)
    ├── lib/                  engine with no react dependency
    │   ├── validation/       file validation (type, size, signature)
    │   ├── media/            video analysis and thumbnail
    │   ├── layers/           layers, motion and geometry
    │   ├── color/            tone correction
    │   ├── audio/            audio mixing
    │   ├── timeline/         timeline calculations
    │   ├── export/           compositor and export
    │   └── format/           formatting helpers
    ├── store/               global state (theme, project, editor, view)
    ├── components/
    │   ├── ui/               icons, toasts, controls, theme
    │   └── layout/           top bar
    └── features/
        ├── import/           import screen
        └── editor/           preview, options panel, timeline and export
```

## Privacy

> **Your videos are processed entirely on your computer.** Nothing is uploaded to any server, neither while you edit nor when you export. The application **collects no data**.

## Contributing

Bug reports and ideas are welcome in the [issues](https://github.com/Cris223511/video-editor/issues). To contribute code, open a *pull request*. The project runs with `npm install` and `npm run dev`, with no extra setup.

## License

**MIT** © [Cris223511](https://github.com/Cris223511). You can use it, modify it and share it freely. The full text is in the [LICENSE](LICENSE) file.

*If the project is useful to you, a star on the repository helps more people find it.*
