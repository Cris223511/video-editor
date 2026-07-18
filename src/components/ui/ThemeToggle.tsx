import { useThemeStore } from '../../store/useThemeStore'
import Icon from './Icon'

// botón para saltar entre claro y oscuro. muestra el icono del tema al que se
// va a cambiar, no el actual
export default function ThemeToggle() {
  const { tema, alternar } = useThemeStore()
  const oscuro = tema === 'dark'

  return (
    <button
      onClick={alternar}
      title={oscuro ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'}
      className="grid h-9 w-9 place-items-center rounded-lg border border-black/10 text-[color:var(--muted)] transition-colors hover:text-[color:var(--text)] dark:border-white/10"
    >
      <Icon name={oscuro ? 'sol' : 'luna'} size={18} />
    </button>
  )
}
