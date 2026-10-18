/**
 * Utilidades para formato y validación de RUN / RUT chileno.
 */

/**
 * Limpia un RUN dejando solo dígitos y 'K' (en mayúscula).
 * Asegura que 'K' solo pueda existir como dígito verificador al final
 * y limita la longitud a un máximo de 9 caracteres (8 de cuerpo + 1 DV).
 */
export function cleanRun(value: string): string {
  if (!value) return '';

  let cleaned = value.replace(/[^0-9kK]/g, '').toUpperCase();

  // Si 'K' está al principio o en el cuerpo, remover las instancias inválidas
  if (cleaned.startsWith('K')) {
    cleaned = cleaned.replace(/^K+/, '');
  }
  cleaned = cleaned.replace(/K(?=.)/g, '');

  if (cleaned.endsWith('K')) {
    const digits = cleaned.slice(0, -1).replace(/\D/g, '').slice(0, 8);
    return digits ? `${digits}K` : '';
  }

  return cleaned.slice(0, 9);
}

/**
 * Formatea un RUN dinámicamente con puntos y guion: ej. "12.345.678-5".
 * A medida que el usuario escribe, separa el cuerpo y el dígito verificador.
 */
export function formatRun(value: string): string {
  const cleaned = cleanRun(value);
  if (!cleaned) return '';
  if (cleaned.length === 1) return cleaned;

  const dv = cleaned.slice(-1);
  const cuerpo = cleaned.slice(0, -1);
  const formattedCuerpo = cuerpo.replace(/\B(?=(\d{3})+(?!\d))/g, '.');

  return `${formattedCuerpo}-${dv}`;
}

/**
 * Valida un RUN chileno utilizando el algoritmo de Módulo 11.
 * Retorna true si el dígito verificador coincide con el cuerpo del RUN.
 */
export function validateRun(value: string): boolean {
  const cleaned = cleanRun(value);

  // Un RUN chileno tiene entre 7 y 8 dígitos de cuerpo más 1 dígito verificador (7 a 9 caracteres limpios)
  if (cleaned.length < 7 || cleaned.length > 9) {
    return false;
  }

  const cuerpo = cleaned.slice(0, -1);
  const dv = cleaned.slice(-1).toUpperCase();

  if (!/^\d+$/.test(cuerpo)) {
    return false;
  }

  // Algoritmo Módulo 11
  let suma = 0;
  let multiplicador = 2;

  for (let i = cuerpo.length - 1; i >= 0; i--) {
    suma += parseInt(cuerpo[i], 10) * multiplicador;
    multiplicador = multiplicador === 7 ? 2 : multiplicador + 1;
  }

  const resto = suma % 11;
  const dvEsperadoCalculado = 11 - resto;

  let dvEsperado = '';
  if (dvEsperadoCalculado === 11) {
    dvEsperado = '0';
  } else if (dvEsperadoCalculado === 10) {
    dvEsperado = 'K';
  } else {
    dvEsperado = String(dvEsperadoCalculado);
  }

  return dv === dvEsperado;
}
