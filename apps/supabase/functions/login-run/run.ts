export function parseRun(value: string): { run: string; dv: string } | null {
  if (value.length > 32 || !/^[\d.kK\s-]+$/.test(value)) return null;

  const compact = value.replace(/[.\s-]/g, '').toUpperCase();
  const match = /^([1-9]\d{0,7})([\dK])$/.exec(compact);
  if (!match) return null;

  const [, run, dv] = match;
  let sum = 0;
  let multiplier = 2;
  for (let index = run.length - 1; index >= 0; index--) {
    sum += Number(run[index]) * multiplier;
    multiplier = multiplier === 7 ? 2 : multiplier + 1;
  }

  const remainder = 11 - (sum % 11);
  const expected = remainder === 11 ? '0' : remainder === 10 ? 'K' : String(remainder);
  return dv === expected ? { run, dv } : null;
}
