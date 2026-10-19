const BELARUS_E164 = /^375\d{9}$/;
const NATIONAL = /^80\d{9}$/;
const OPERATOR = /^(17|25|29|33|44)\d{7}$/;

/**
 * Нормализует белорусский номер телефона к E.164 (375XXXXXXXXX).
 * Принимает: +375XXXXXXXXX, 375XXXXXXXXX, 80XXXXXXXXX, 17/25/29/33/44XXXXXXX.
 * Возвращает null, если номер не является белорусским.
 */
export function normalizeBelarusPhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");
  if (BELARUS_E164.test(digits)) {
    return digits;
  }
  if (NATIONAL.test(digits)) {
    return `375${digits.slice(2)}`;
  }
  if (OPERATOR.test(digits)) {
    return `375${digits}`;
  }
  return null;
}
