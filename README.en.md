<p align="center">
  <img src="public/logo.png" alt="Video Editor logo" width="120">
</p>

<h1 align="center">Video Editor</h1>

<p align="center">
  <b>A video editor that runs entirely in the browser.</b> Build the timeline across
  several levels, grade the color with wheels and curves, censor what moves, add text,
  images and shapes, and export the finished file.
  <i>Nothing to install, and your videos never leave your computer.</i>
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

Video Editor runs **right in the browser**, with nothing to install:

| Version | Link | Status |
| ------- | ---- | ------ |
| 2.0.0 | **[video-editor-plus.vercel.app](https://video-editor-plus.vercel.app)** | Available |

> Open it and start editing, no account or download needed. What changed in each version is in the [changelog](CHANGELOG.md).

## Why

Editing a short video **should not** force you to install a heavy program, create an account or upload your material to someone else's cloud. Desktop tools are powerful, but they take up gigabytes and are hard to learn; web ones usually ask for a subscription, add a watermark or process the videos on their servers.

Video Editor does **all the work inside the browser**: you import, edit and export without a single frame leaving your computer. It is free, open source and *with no hidden paid features*.

### Who it is for

For anyone with one specific video to sort out who wants it finished today: a trim with music, a vertical piece for social media, a recorded screen tutorial, an interview where a face or a license plate has to be covered. It does not replace a professional desktop suite, and it does not try to. It covers everyday work without asking for anything in return.

## Features

### Import and media

- **Validated import:** you drag or pick videos and images, and before they join the project their type, their size and their *real binary signature* are checked, not just the extension. The accepted formats are MP4, WebM, MOV, MKV, AVI, M4V and OGV, with a cap of 1.5 GB per file.
- **Media library:** imported files stay to one side with their thumbnail, resolution, duration and weight, ready to bring onto the timeline when you need them.
- **No quantity limit:** the project takes as many media files as your computer can handle, just like a desktop editor.

### Timeline

- **Up to six video levels:** clips stack on independent tracks and move from one to another without losing their place in time. The top level is the one you see, and each adjusts its height by pulling its bottom edge.
- **Trimming and splitting:** set each clip's in and out points by dragging its edges, or cut the clip wherever the playhead is. Trimming is non-destructive, so the material you left out is still there if you change your mind.
- **Magnetic dragging:** clips snap to the start, to the playhead and to the edges of other clips, layers and audio regions, so they fit together without leaving thousandth-of-a-second gaps.
- **Speed per clip:** from 0.25x to 4x, with quick presets for the usual values. The clip keeps the same piece of video and its footprint on the track is recalculated automatically.
- **Closing empty gaps:** when a gap is left between two clips it is marked with a dashed border, and closing it pulls everything behind it on that level forward by exactly its length. The other levels are untouched, so the sync does not break.
- **Alignment guides:** moving a layer over the preview brings up guides that snap it to the center and edges of the canvas, and to those of the other layers as well. Holding **Alt** turns snapping off, for when something has to sit right next to a guide.
- **Timeline zoom:** zoom in to work on detail or out to see the whole edit, with the buttons, the keys or **Ctrl** and the mouse wheel, which keeps the second under the cursor fixed in place.
- **Frame strip:** each clip shows its content as thumbnails spread along its duration, not a single stretched image, so you recognize it at a glance without playing it.

### Transitions

There are **twenty-one transitions**, grouped into five families and described as data in a single catalog. That is what guarantees that what you see while editing is identical to what comes out exported, because the preview and the compositor run the same engine.

- **No transition:** the hard cut, one shot starting right where the previous one ends.
- **Fades:** cross fade with the previous shot, fade to black and fade to white.
- **Wipes:** right, left, up, down and diagonal, with the edge of the cut slightly softened so it does not look cheap.
- **Shapes and openings:** blinds, horizontal doors, vertical doors, circular wipe, diamond and thirds.
- **Zooms and pushes:** push in all four directions, zoom in and zoom out.

The gallery has its own search, which ignores case and accents because that is how people actually type, and each sample runs the real transition when you hover over it. The duration goes from 0.2 to 2 seconds and can also be set by pulling the edge of the transition on the timeline itself.

### Color grading

- **Wheels per tonal range:** three independent wheels for shadows, midtones and highlights. You drag toward the color you want to give each range, **Shift** fine-tunes the movement and a double click returns the wheel to the center.
- **Curves per channel:** four editable curves, a master one for luminance and one each for the red, green and blue channels. Points are added with a click, bent by dragging and removed with a double click.
- **Tone adjustments:** exposure, contrast, saturation, temperature and tint, all from -100 to 100.

Everything is applied live on the preview and reaches the exported file unchanged, because the wheels travel as a per-channel curve instead of being recomputed separately.

### Motion censorship

- **Three shapes:** circle, rectangle or free brush, which you use to draw the mask over the video itself and set the stroke width.
- **Three effects:** pixelate, blur or cover completely, with adjustable intensity on the first two.
- **Path recorded with the cursor:** you play the video and drag the element following whatever you want to cover. Every instant is stored as a point.
- **Slow motion while recording:** the video can play at half or quarter speed while the recording lasts, which is what makes it possible to follow a face or a plate moving fast. The path is stored in the video's real time, not the slowed-down one.
- **Editable path:** the track is drawn over the preview and any node can be dragged to correct where it goes, or removed with a double click. A single point can also be added at the playhead position.

Motion is not exclusive to censorship: text, images and shapes are animated with the same controls.

### Layers over the video

- **Text:** content, twelve typefaces previewed in their own lettering, size from 8 to 400 px, bold, italic, underline, alignment, color and opacity. It also takes its own background with color and opacity, an outline with color and width, and a shadow.
- **Images:** logos and photos on top, sized from 3 to 200 % of the canvas width, with independent cropping on each of the four sides and adjustable opacity. PNG, JPG, WebP, GIF, BMP and AVIF up to 20 MB are accepted, with their binary signature checked too.
- **Shapes:** rectangle, rounded, ellipse, triangle, star, line and arrow, with independent fill and border, or color and width in the case of the line and the arrow.
- **Frame:** ten decorative styles around the video, among them solid, double, dashed, dotted, rounded with adjustable radius, shadow, neon, gradient, vignette and polaroid.

Every layer is moved and resized with eight handles in the preview, keeping its proportions if you hold **Shift**, and on the timeline you decide from which second to which second it appears.

### Audio

- **Overall volume** for the project, from 0 to 200 %, with a mute button that remembers the previous level.
- **Volume regions:** you add a stretch, place it and trim it on the timeline, and give it its own gain between 0 and 200 %. Handy for dropping the music right where somebody speaks, or for muting just one fragment.

### Canvas

- **Six aspect ratios:** 16:9, 9:16, 1:1, 4:5, 4:3 and 3:4, or automatic fitting to the dimensions of the first video.
- **Filling the bands:** when the video does not cover the whole canvas, the leftover areas are filled with a color of your choosing or with the video itself, enlarged and blurred, with adjustable blur. This is the usual way to place a vertical shot on a landscape canvas without leaving two flat strips.

### Export

- **All inside the browser:** the project plays back drawing each frame onto a canvas at the chosen resolution, the audio is mixed with Web Audio and everything is recorded together with MediaRecorder.
- **Format depending on the browser:** MP4 with H.264 and AAC is preferred, and if the browser does not support it, it falls back to WebM with VP9 or VP8. The file downloads on its own when it finishes.
- **24, 30 or 60 frames per second,** chosen before starting.
- **No quality loss:** the bitrate is derived from the resolution, with a 40 Mbps ceiling, and the audio stays in sync.
- **Progress and cancellation:** you see the percentage advance and can stop halfway. Because it happens in real time, a one-minute video takes about a minute to export.

### Saved projects

- **Saved in the browser itself:** projects live in IndexedDB with their videos included, not as text, so they survive closing the tab. A project keeps its identity between saves, so saving again updates the same one instead of leaving copies behind.
- **Autosave** four seconds after the last change that matters, with a notice in the top bar when there are pending changes and another one before closing the tab. Moving the playhead or switching tools does not trigger a save.
- **Download and import:** a project is packed into a `.veproj` file with its media inside, ready to take to another computer and open again. On import it gets a new identity, so bringing it in twice does not overwrite what you already had.
- **Listing with search,** which ignores case and accents, four sort criteria (newest, oldest and by name in both directions) and pagination six at a time. Each card shows the cover, duration, number of media files and the creation and last-edited dates.
- **Duplicate, download and delete** from the card itself, with a confirmation before deleting because the stored videos go with it.
- **Details sheet:** each project opens a sheet with what is known about it and its files, from the clips, levels and layers to the output resolution and aspect ratio, the space used and, for each media file, its dimensions, orientation, duration, format and megapixels.
- **Its own address:** every open project has its link, so you can reload the page or bookmark it without losing track of which one you were working on.
- **Space warning:** the application checks how much the browser reserves on the computer and how much you have used, to warn you before a save is rejected for lack of room.

### Presentation site

The application does not start in the editor, but on a site that explains what it does and lets you try it before importing anything.

- **Home page with demos that really work:** the color wheels, eight of the twenty-one transitions, the censorship with its draggable box, the preview controls and the canvas ratio change. These are not recorded videos, they run the same engine as the editor.
- **A tour of the tools,** which advances on its own until you touch one, with the editing and export represented in animated mockups.
- **Frequently asked questions** and a step-by-step of how a video is built from start to finish.
- **User manual** on its own page, covering editing, color, layers, censorship, saving and exporting step by step, plus the shortcut table.
- **Terms and conditions** and **privacy policy,** written to be understood on a single read, with a side index generated from the sections themselves that marks how far you have read.

### Interface

- **Light and dark theme,** with light by default and a fade between the two instead of an abrupt jump.
- **Eleven tools** on a fixed side rail: project, properties, canvas, frame, text, image, shape, audio, censorship, speed and tone. It stays visible even if you collapse the panel.
- **Contextual options panel:** each tool shows only its own controls, and what you adjust is visible in the preview as you move it. Selecting a clip, a layer or a region opens its tool directly.
- **Adjustable panels,** to give more room to the preview or the timeline depending on what you are doing.
- **Everything local:** *no accounts, no watermarks, no paid features.*

## Keyboard shortcuts

| Action | Shortcut |
| ------ | -------- |
| Play or pause | `Spacebar` |
| Split at the playhead | `S` |
| Delete the selection (clip, layer or audio region) | `Del` or `Backspace` |
| Move the playhead one frame | `←` and `→` |
| Move the playhead one second | `Shift` + `←` or `→` |
| Go to the start or the end | `Home` and `End` |
| Zoom the timeline in or out | `+` and `-`, or `Ctrl` + mouse wheel |
| Drop the selection | `Esc` |

There is no save shortcut because you do not need one: the project saves itself on every change. While you are typing in a text field the shortcuts do not fire, so the spacebar writes a space instead of splitting the video.

## Requirements

A recent desktop browser based on Chromium or Firefox. There is nothing to install, no permissions to grant, and no need to stay connected once the page has loaded. To save projects it helps to have free disk space, because they include the full videos.

## Running locally

You only need **Node.js 18** or later.

```
npm install
npm run dev
```

Vite serves the application at `http://localhost:5173`.

## Commands

| Command | What it does |
| ------- | ------------ |
| `npm run dev` | Development server with hot reload. |
| `npm run build` | Type-checks and builds the production version into `dist`. |
| `npm run preview` | Serves the build result locally. |

## Technology

| Component | Tool | What it is used for |
| --------- | ---- | ------------------- |
| Interface | [React 18](https://react.dev/) and [TypeScript 5](https://www.typescriptlang.org/) | The application and its components, strictly typed |
| Bundling | [Vite 5](https://vite.dev/) | Development server and production build |
| Styles | [Tailwind CSS](https://tailwindcss.com/) | The design and the light or dark theme |
| State | [Zustand](https://zustand-demo.pmnd.rs/) | The project, editor, theme and view state |
| Routing | [React Router](https://reactrouter.com/) | One address per view, reloadable and shareable |
| Animation | [Framer Motion](https://www.framer.com/motion/) and [Lenis](https://lenis.darkroom.engineering/) | Interface transitions and the site's smooth scrolling |
| Components | [Radix UI](https://www.radix-ui.com/), [Embla](https://www.embla-carousel.com/), [react-resizable-panels](https://github.com/bvaughn/react-resizable-panels) | Dialogs, accordions, menus, carousels and adjustable panels |
| UI details | [lucide-react](https://lucide.dev/), [react-colorful](https://omgovich.github.io/react-colorful/), [Sonner](https://sonner.emilkowal.ski/) | Vector icons, color pickers and notices |
| Typefaces | Inter and Plus Jakarta Sans | Served from the package itself, never requested from third parties |
| Export | Canvas, Web Audio and MediaRecorder | Video render and recording, all in the browser |
| Storage | IndexedDB | Saved projects with their media |

The editing engine (validation, media analysis, color, transitions, compositor and export) lives in `src/lib`, **separate from the interface** in `src/components` and `src/features`, so the logic does not depend on React.

## Project structure

```
video-editor/
├── index.html
├── vite.config.ts            COOP/COEP headers in case WebCodecs is used later
├── vercel.json               the same headers in production
├── tailwind.config.js
└── src/
    ├── main.tsx              entry point
    ├── App.tsx               root of the application
    ├── rutas.tsx             router and the address of each view
    ├── rutasDef.ts           the addresses in a single place
    ├── index.css             theme tokens and base styles
    ├── config/               version, limits and accepted formats
    ├── types/                domain types (media, layers, audio, frame, time)
    ├── lib/                  engine with no react dependency
    │   ├── validation/       file validation (type, size, signature)
    │   ├── media/            video analysis and thumbnails
    │   ├── layers/           layers, motion, geometry and guides
    │   ├── color/            wheels, curves and tone adjustments
    │   ├── transiciones/     catalog, engine and painting
    │   ├── audio/            gain per region
    │   ├── timeline/         timeline calculations
    │   ├── proyecto/         storage, packaging and session
    │   ├── export/           compositor and export
    │   ├── scroll/           the site's smooth scrolling
    │   └── format/           formatting helpers
    ├── store/                global state (theme, project, editor, view)
    ├── components/
    │   ├── ui/               icons, notices, controls, wheels and curves
    │   ├── sitio/            pieces and demos for the presentation site
    │   └── layout/           top bar, navigation and footer
    └── features/
        ├── sitio/            home page, manual, legal pages and not found
        ├── import/           import screen
        ├── proyectos/        listing and details of saved projects
        └── editor/           preview, panels, timeline and export
```

## Privacy

> **Your videos are processed entirely on your computer.** Nothing is uploaded to any server, neither while you edit nor when you export. There are no accounts, no tracking and no analytics. The projects you save stay in your own browser's storage, and deleting them from the application really does remove them.

## Contributing

Bug reports and ideas are welcome in the [issues](https://github.com/Cris223511/video-editor/issues). To contribute code, open a *pull request*. The project runs with `npm install` and `npm run dev`, with no extra setup.

## License

**MIT** © [Cris223511](https://github.com/Cris223511). You can use it, modify it and share it freely. The full text is in the [LICENSE](LICENSE) file.

*If the project is useful to you, a star on the repository helps more people find it.*
