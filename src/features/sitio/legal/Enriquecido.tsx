import { Fragment, ReactNode } from 'react'

const MARCA = 'Video Editor'

// el nombre del producto se pinta con los dos colores del logotipo, para que
// leerlo dentro de un párrafo remita a la marca sin necesidad de comillas
function Marca() {
  return (
    <span className="font-display font-bold">
      <span className="text-[color:var(--text)]">Video </span>
      <span className="text-brand">Editor</span>
    </span>
  )
}

// busca el nombre del producto dentro de un tramo de texto y lo sustituye por su
// versión en dos colores, dejando el resto tal cual
function conMarca(texto: string): ReactNode[] {
  const partes = texto.split(MARCA)
  return partes.flatMap((parte, i) =>
    i === 0 ? [parte] : [<Marca key={`m${i}`} />, parte],
  )
}

// los textos legales viven como cadenas, así que necesitan una forma de marcar
// lo que va resaltado sin arrastrar una librería de markdown entera para dos
// cosas. lo que va entre asteriscos dobles sale en negrita y con el color del
// texto normal, que sobre el gris de los párrafos ya destaca lo suficiente
export default function Enriquecido({ texto }: { texto: string }) {
  const partes = texto.split('**')
  return (
    <>
      {partes.map((parte, i) => (
        <Fragment key={i}>
          {i % 2 === 1 ? (
            <strong className="font-semibold text-[color:var(--text)]">{conMarca(parte)}</strong>
          ) : (
            conMarca(parte)
          )}
        </Fragment>
      ))}
    </>
  )
}
