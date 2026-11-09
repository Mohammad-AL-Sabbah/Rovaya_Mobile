/** يحوّل الأرقام العربية-الهندية (٠١٢٣) والفارسية إلى أرقام لاتينية */
export function toLatinDigits(value: string): string {
  return value
    .replace(/[\u0660-\u0669]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[\u06F0-\u06F9]/g, (d) => String(d.charCodeAt(0) - 0x06f0));
}
