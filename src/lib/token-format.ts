const compact = new Intl.NumberFormat('en-US', {
  notation: 'compact',
  maximumFractionDigits: 2,
});
export const tokenNumber = (value: number | null | undefined) =>
  value == null ? '—' : compact.format(value);
export function tokenUsd(value: number | null | undefined, price = false) {
  if (value == null) return '—';
  if (price && value > 0 && value < 1)
    return `$${value.toLocaleString('en-US', { maximumSignificantDigits: 4 })}`;
  return `$${compact.format(value)}`;
}
export const tokenPercent = (value: number | null | undefined) =>
  value == null ? '—' : `${value > 0 ? '+' : ''}${value.toFixed(2)}%`;
