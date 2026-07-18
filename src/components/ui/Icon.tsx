import { CSSProperties, ReactElement } from 'react'

export type NombreIcono =
  | 'logo'
  | 'subir'
  | 'video'
  | 'sol'
  | 'luna'
  | 'cerrar'
  | 'check'
  | 'alerta'
  | 'info'
  | 'papelera'
  | 'pelicula'
  | 'mas'
  | 'play'
  | 'pausa'
  | 'inicio'
  | 'exportar'
  | 'atras'
  | 'texto'
  | 'imagen'
  | 'audio'
  | 'ajustes'
  | 'tijeras'
  | 'censura'
  | 'velocidad'
  | 'tono'
  | 'zoomMas'
  | 'zoomMenos'
  | 'lienzo'
  | 'marco'
  | 'figura'

interface Props {
  name: NombreIcono
  size?: number
  className?: string
  style?: CSSProperties
}

// biblioteca de iconos vectoriales propios. todos heredan el color con
// currentColor, así se adaptan al tema sin necesitar versiones aparte
const trazos: Record<NombreIcono, ReactElement> = {
  logo: (
    <>
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <path d="m10 8.5 6 3.5-6 3.5z" fill="currentColor" stroke="none" />
    </>
  ),
  subir: (
    <>
      <path d="M4 15v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" />
      <path d="M12 3v12" />
      <path d="m7 8 5-5 5 5" />
    </>
  ),
  video: (
    <>
      <rect x="3" y="6" width="12" height="12" rx="2" />
      <path d="m21 8-6 4 6 4z" />
    </>
  ),
  sol: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </>
  ),
  luna: <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />,
  cerrar: <path d="M18 6 6 18M6 6l12 12" />,
  check: <path d="M20 6 9 17l-5-5" />,
  alerta: (
    <>
      <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" />
      <path d="M12 9v4M12 17h.01" />
    </>
  ),
  info: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5M12 8h.01" />
    </>
  ),
  papelera: (
    <path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
  ),
  pelicula: (
    <>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M7 4v16M17 4v16M3 9h4M3 15h4M17 9h4M17 15h4" />
    </>
  ),
  mas: <path d="M12 5v14M5 12h14" />,
  play: <path d="M7 4v16l13-8z" fill="currentColor" stroke="none" />,
  pausa: (
    <>
      <rect x="7" y="4" width="3.4" height="16" rx="1" fill="currentColor" stroke="none" />
      <rect x="13.6" y="4" width="3.4" height="16" rx="1" fill="currentColor" stroke="none" />
    </>
  ),
  inicio: (
    <>
      <path d="M19 5v14l-11-7z" fill="currentColor" stroke="none" />
      <path d="M5 5v14" />
    </>
  ),
  exportar: (
    <>
      <path d="M12 3v12" />
      <path d="m7 10 5 5 5-5" />
      <path d="M5 21h14" />
    </>
  ),
  atras: <path d="M19 12H5M12 19l-7-7 7-7" />,
  texto: <path d="M4 6V4h16v2M12 4v16M9 20h6" />,
  imagen: (
    <>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <circle cx="8.5" cy="9.5" r="1.5" />
      <path d="m4 18 5-5 4 4 3-3 4 4" />
    </>
  ),
  audio: (
    <>
      <path d="M11 5 6 9H3v6h3l5 4z" />
      <path d="M16 9a3 3 0 0 1 0 6M19 6a7 7 0 0 1 0 12" />
    </>
  ),
  ajustes: (
    <path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6" />
  ),
  tijeras: (
    <>
      <circle cx="6" cy="6" r="3" />
      <circle cx="6" cy="18" r="3" />
      <path d="M20 4 8.1 15.9M14.5 14.5 20 20M8.1 8.1 12 12" />
    </>
  ),
  censura: <path d="M12 3s6 5.7 6 10a6 6 0 0 1-12 0c0-4.3 6-10 6-10z" />,
  velocidad: (
    <>
      <path d="M5 19a9 9 0 1 1 14 0" />
      <path d="m12 13 4-3" />
    </>
  ),
  tono: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 3a9 9 0 0 0 0 18 4.5 4.5 0 0 0 0-9 4.5 4.5 0 0 1 0-9z" fill="currentColor" stroke="none" />
    </>
  ),
  zoomMas: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="m21 21-4.3-4.3M11 8v6M8 11h6" />
    </>
  ),
  zoomMenos: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="m21 21-4.3-4.3M8 11h6" />
    </>
  ),
  lienzo: <path d="M8 3v18M16 3v18M3 8h18M3 16h18" />,
  marco: (
    <>
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <rect x="7" y="7" width="10" height="10" />
    </>
  ),
  figura: (
    <>
      <rect x="3" y="4" width="11" height="11" rx="1" />
      <circle cx="15.5" cy="15.5" r="5.5" />
    </>
  ),
}

export default function Icon({ name, size = 20, className, style }: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={style}
      aria-hidden="true"
    >
      {trazos[name]}
    </svg>
  )
}
