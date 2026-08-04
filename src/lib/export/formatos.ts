// datos de los formatos exóticos que solo se pueden armar con ffmpeg.wasm. este módulo es a propósito
// LIGERO (no importa ffmpeg) para que el diálogo pueda usar sus etiquetas y su lógica sin arrastrar la
// librería pesada; el motor de conversión vive aparte en ffmpegExport y entra por import dinámico

// contenedores que el navegador no sabe armar por su cuenta. se parten del mp4 ya exportado
export type FormatoExotico = 'mov' | 'avi' | 'wmv' | 'flv' | '3gp'

// el orden en que se muestran en el selector
export const FORMATOS_EXOTICOS: FormatoExotico[] = ['mov', 'avi', 'wmv', 'flv', '3gp']

// tipo mime real de cada envase, para el blob final
export const MIME_EXOTICO: Record<FormatoExotico, string> = {
  mov: 'video/quicktime',
  avi: 'video/x-msvideo',
  wmv: 'video/x-ms-wmv',
  flv: 'video/x-flv',
  '3gp': 'video/3gpp',
}

// ¿el formato obliga a recomprimir el video? mov, avi, flv y 3gp aceptan el H.264 tal cual (remux sin
// pérdida y rápido); wmv usa el envase ASF, que no admite H.264, así que hay que recodificar a wmv2
export const RECOMPRIME: Record<FormatoExotico, boolean> = {
  mov: false,
  avi: false,
  flv: false,
  '3gp': false,
  wmv: true,
}

// ¿es uno de los formatos exóticos? (protege el estrechamiento de tipos)
export function esExotico(f: string): f is FormatoExotico {
  return (FORMATOS_EXOTICOS as string[]).includes(f)
}
