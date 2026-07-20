import { CSSProperties } from 'react'
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  ChevronRight,
  Clapperboard,
  Download,
  EyeOff,
  Film,
  Frame,
  Gauge,
  Image as ImagenIcono,
  Info,
  LayoutDashboard,
  Moon,
  Palette,
  Pause,
  Play,
  Plus,
  Scissors,
  Shapes,
  SkipBack,
  SlidersHorizontal,
  Sun,
  Trash2,
  Type,
  Upload,
  Video,
  Volume2,
  Wind,
  X,
  ZoomIn,
  ZoomOut,
} from 'lucide-react'

// los iconos salen de lucide, un juego vectorial coherente y afinado, en lugar
// de dibujarlos a mano uno por uno. los nombres en español se mantienen para
// no tener que tocar los sitios que ya los usan
const iconos = {
  logo: Clapperboard,
  subir: Upload,
  video: Video,
  sol: Sun,
  luna: Moon,
  cerrar: X,
  check: Check,
  alerta: AlertTriangle,
  info: Info,
  papelera: Trash2,
  pelicula: Film,
  mas: Plus,
  play: Play,
  pausa: Pause,
  inicio: SkipBack,
  exportar: Download,
  atras: ArrowLeft,
  desplegar: ChevronRight,
  texto: Type,
  imagen: ImagenIcono,
  audio: Volume2,
  ajustes: SlidersHorizontal,
  tijeras: Scissors,
  censura: EyeOff,
  velocidad: Gauge,
  tono: Palette,
  efectos: Wind,
  zoomMas: ZoomIn,
  zoomMenos: ZoomOut,
  lienzo: LayoutDashboard,
  marco: Frame,
  figura: Shapes,
} as const

export type NombreIcono = keyof typeof iconos

interface Props {
  name: NombreIcono
  size?: number
  className?: string
  style?: CSSProperties
}

export default function Icon({ name, size = 20, className, style }: Props) {
  const Componente = iconos[name]
  return <Componente size={size} className={className} style={style} strokeWidth={1.9} />
}
