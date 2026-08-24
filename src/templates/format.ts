export function formatPrice(minorUnits: number, currency = "KES"): string {
  return new Intl.NumberFormat("en-KE", { style: "currency", currency }).format(minorUnits / 100);
}
