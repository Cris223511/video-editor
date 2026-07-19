import { ProyectoGuardado, ResumenProyecto } from './formato'

const BASE = 'video-editor-plus'
const TIENDA = 'proyectos'
const VERSION_BASE = 1

// IndexedDB guarda los archivos de video tal cual, sin convertirlos a texto.
// esa es la razón de usarla en lugar de localStorage, que solo admite cadenas y
// se quedaría corto en cuanto el proyecto tuviera un par de clips
function abrir(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('Este navegador no permite guardar proyectos.'))
      return
    }
    const req = indexedDB.open(BASE, VERSION_BASE)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(TIENDA)) {
        const tienda = db.createObjectStore(TIENDA, { keyPath: 'id' })
        // ordenar por fecha de cambio deja arriba lo último que se tocó
        tienda.createIndex('modificado', 'modificado')
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error ?? new Error('No se pudo abrir el almacén.'))
  })
}

// envoltorio para no repetir el mismo baile de transacción en cada operación
function operar<T>(
  modo: IDBTransactionMode,
  fn: (tienda: IDBObjectStore) => IDBRequest,
): Promise<T> {
  return abrir().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const tx = db.transaction(TIENDA, modo)
        const req = fn(tx.objectStore(TIENDA))
        req.onsuccess = () => resolve(req.result as T)
        req.onerror = () => reject(req.error ?? new Error('Operación rechazada.'))
        tx.oncomplete = () => db.close()
      }),
  )
}

export function guardarProyecto(p: ProyectoGuardado): Promise<void> {
  return operar<void>('readwrite', (t) => t.put(p))
}

export function leerProyecto(id: string): Promise<ProyectoGuardado | undefined> {
  return operar<ProyectoGuardado | undefined>('readonly', (t) => t.get(id))
}

export function borrarProyecto(id: string): Promise<void> {
  return operar<void>('readwrite', (t) => t.delete(id))
}

// la lista solo necesita los datos de cabecera, así que los medios se descartan
// nada más leerlos en vez de mantenerlos vivos en memoria
export async function listarProyectos(): Promise<ResumenProyecto[]> {
  const todos = await operar<ProyectoGuardado[]>('readonly', (t) => t.getAll())
  return todos
    .map((p) => ({
      id: p.id,
      titulo: p.titulo,
      creado: p.creado,
      modificado: p.modificado,
      portada: p.portada,
      numMedios: p.medios?.length ?? 0,
      duracion: (p.edicion?.clips ?? []).reduce(
        (max, c) => Math.max(max, c.inicio + c.duracion),
        0,
      ),
    }))
    .sort((a, b) => b.modificado - a.modificado)
}

// cuánto espacio hay usado y disponible, para poder avisar antes de que el
// navegador rechace un guardado por falta de sitio
export async function espacio(): Promise<{ usado: number; total: number } | null> {
  if (!navigator.storage?.estimate) return null
  const e = await navigator.storage.estimate()
  return { usado: e.usage ?? 0, total: e.quota ?? 0 }
}
