import type { ReactNode } from 'react';
export function Key({ children }: { children: ReactNode }) {
  return <kbd>{children}</kbd>;
}
export function Meter({ value, label }: { value: number; label?: string }) {
  return (
    <div className="meter-wrap">
      {label && <span>{label}</span>}
      <div className="meter">
        <i style={{ width: `${Math.max(0, Math.min(1, value)) * 100}%` }} />
      </div>
    </div>
  );
}
export function Icon({
  kind = 'generator',
  size = 24,
}: {
  kind?: string;
  size?: number;
}) {
  const paths: Record<string, string> = {
    generator: 'M4 6h3V2h2v4h6V2h2v4h3v14H4zm3 3v8h10V9zm3 1h4v2h-2v4h-2z',
    cage: 'M4 6h16v16H4zm2 2v12h2V8zm4 0v12h4V8zm6 0v12h2V8zM8 2h8v2H8z',
    gate: 'M2 2h4v20H2zm16 0h4v20h-4zM6 4h12v3H6zm2 5h2v13H8zm6 0h2v13h-2z',
    skull: 'M6 2h12v2h2v12h-4v6h-3v-4h-2v4H8v-6H4V4h2zm1 6v5h4V8zm6 0v5h4V8z',
    heart: 'M2 7h4V3h5v4h2V3h5v4h4v7h-4v4h-4v4h-4v-4H6v-4H2z',
  };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        fillRule="evenodd"
        d={paths[kind] ?? paths.skull}
      />
    </svg>
  );
}
export function Panel({
  title,
  eyebrow,
  children,
  className = '',
}: {
  title?: string;
  eyebrow?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`panel ${className}`}>
      {eyebrow && <p className="eyebrow">{eyebrow}</p>}
      {title && <h2>{title}</h2>}
      {children}
    </section>
  );
}

export const keyLabel = (code: string) =>
  code
    .replace('Key', '')
    .replace('Left', '')
    .replace('Control', 'Ctrl')
    .replace('Arrow', '')
    .toUpperCase();
