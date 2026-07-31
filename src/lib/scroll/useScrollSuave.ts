// el desplazamiento con inercia (Lenis) se quitó a pedido del dueño: se sentía demasiado
// resbaladizo en el sitio. ahora la rueda se comporta como la del navegador, sin peso añadido.
// se conserva la firma del hook y la función irA para no tocar quien las usa; irA salta a una
// sección con el desplazamiento nativo, descontando el alto de la barra superior fija

export function useScrollSuave(_activo: boolean) {
  // sin Lenis no hay nada que montar; se devuelve irA por compatibilidad con quien lo esperaba
  return { irA }
}

// lleva la página hasta un elemento respetando el alto de la barra superior. usa el
// desplazamiento nativo del navegador, sin inercia
export function irA(id: string) {
  const el = document.getElementById(id)
  if (!el) return
  const top = el.getBoundingClientRect().top + window.scrollY - 96
  window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' })
}
