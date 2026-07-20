// versión de la aplicación. se muestra en la barra superior y en los ajustes,
// y acompaña a la del package.json
export const VERSION = '2.2.0'

// límites y formatos aceptados al importar medios. el tope por archivo es de
// 1.5 GB; a nivel de proyecto no hay límite de cantidad, igual que en un
// editor de escritorio
export const MAX_VIDEO_BYTES = 1.5 * 1024 * 1024 * 1024

export const VIDEO_EXTENSIONS = ['mp4', 'webm', 'mov', 'mkv', 'avi', 'm4v', 'ogv'] as const

export const VIDEO_MIME_PREFIX = 'video/'

// firmas binarias mínimas para no fiarnos solo de la extensión o del tipo que
// declara el navegador. sirven de barrera ante un archivo disfrazado de video
export const VIDEO_MAGIC = {
  // mp4, mov y sus derivados llevan 'ftyp' a partir del byte 4
  ftyp: [0x66, 0x74, 0x79, 0x70],
  // matroska y webm comparten el encabezado ebml
  ebml: [0x1a, 0x45, 0xdf, 0xa3],
  // avi es un contenedor riff
  riff: [0x52, 0x49, 0x46, 0x46],
  // ogg empieza con 'OggS'
  oggs: [0x4f, 0x67, 0x67, 0x53],
}
