// Quién ve y puede usar la carga de archivos del programa de obra.
// Se mantiene separado del lector de archivos para que el cliente no cargue librerías pesadas.
export const EMAILS_IMPORTAR = ["eliasjasqui02@gmail.com"];

export function puedeImportar(email?: string | null) {
  return !!email && EMAILS_IMPORTAR.includes(email.toLowerCase());
}
