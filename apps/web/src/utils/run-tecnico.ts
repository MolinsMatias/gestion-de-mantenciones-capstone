export interface RunParts { run: string; dv: string }

export function parseRun(value: unknown): RunParts | null {
  if (typeof value !== 'string') return null
  const clean = value.trim().toUpperCase().replace(/[.\s-]/g, '')
  if (!/^\d{7,8}[0-9K]$/.test(clean)) return null
  const run = clean.slice(0, -1).replace(/^0+/, '')
  const dv = clean.slice(-1)
  if (!run) return null
  let sum = 0
  let factor = 2
  for (let i = run.length - 1; i >= 0; i--) {
    sum += Number(run[i]) * factor
    factor = factor === 7 ? 2 : factor + 1
  }
  const result = 11 - (sum % 11)
  const expected = result === 11 ? '0' : result === 10 ? 'K' : String(result)
  return dv === expected ? { run, dv } : null
}

export function formatearRunTecnico(valor: string): string {
  const limpio = valor
    .replace(/[^0-9kK]/g, '')
    .toUpperCase()
    .replace(/K(?=.)/g, '')
    .slice(0, 9)

  if (limpio.length <= 1) return limpio

  const cuerpo = limpio.slice(0, -1)
  const dv = limpio.slice(-1)
  const cuerpoConPuntos = cuerpo.replace(/\B(?=(\d{3})+(?!\d))/g, '.')

  return `${cuerpoConPuntos}-${dv}`
}