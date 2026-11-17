/** Mismo módulo 11 que el login: admite puntos, guion y DV K. */
export function parseRun(valor: string): { run: string; dv: string } | null {
  if (valor.length > 32 || !/^[\d.kK\s-]+$/.test(valor)) return null
  const coincidencia = /^([1-9]\d{0,7})([\dK])$/.exec(
    valor.replace(/[.\s-]/g, '').toUpperCase(),
  )
  if (!coincidencia) return null
  const run = coincidencia[1]!
  const dv = coincidencia[2]!
  let suma = 0
  let multiplicador = 2
  for (let i = run.length - 1; i >= 0; i--) {
    suma += Number(run[i]) * multiplicador
    multiplicador = multiplicador === 7 ? 2 : multiplicador + 1
  }
  const resto = 11 - (suma % 11)
  return dv === (resto === 11 ? '0' : resto === 10 ? 'K' : String(resto))
    ? { run, dv }
    : null
}
export function formatearRun(valor: string): string {
  const limpio = valor
    .replace(/[^0-9kK]/g, '')
    .toUpperCase()
    .slice(0, 9)
  if (limpio.length < 2) return limpio
  return `${limpio.slice(0, -1).replace(/\B(?=(\d{3})+(?!\d))/g, '.')}-${limpio.slice(-1)}`
}
export function validarPassword(valor: string): string {
  if (valor.length < 6)
    return 'La contraseña debe tener al menos 6 caracteres.'
  if (new TextEncoder().encode(valor).length > 72)
    return 'La contraseña no debe superar 72 bytes; los caracteres especiales pueden ocupar más de uno.'
  return ''
}
