// Spoločné malé komponenty

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { countryName, flagEmoji } from '../data/countries';
import { formLevel } from '../engine/ratings';
import type { Position } from '../engine/types';

interface BadgeClub {
  colors: [string, string];
  abbr: string;
  logo?: string | null;
}

/** Adresa loga – relatívna cesta sa berie od koreňa hry */
export function logoUrl(logo: string): string {
  if (/^(https?:|data:|blob:)/.test(logo)) return logo;
  return `${import.meta.env.BASE_URL}${logo.replace(/^\//, '')}`;
}

/** Malé logo klubu – obrázok, a ak chýba, štít vo farbách klubu */
export function ClubBadge({ club, size = 28 }: { club: BadgeClub; size?: number }) {
  const [failed, setFailed] = useState(false);
  if (club.logo && !failed) {
    return (
      <img
        src={logoUrl(club.logo)}
        alt={club.abbr}
        width={size}
        height={size}
        loading="lazy"
        style={{ objectFit: 'contain', flexShrink: 0 }}
        onError={() => setFailed(true)}
      />
    );
  }
  return <ShieldBadge colors={club.colors} abbr={club.abbr} size={size} />;
}

function ShieldBadge({ colors, abbr, size }: { colors: [string, string]; abbr: string; size: number }) {
  const [a, b] = colors;
  const id = `g-${abbr}-${a.slice(1)}-${b.slice(1)}`;
  return (
    <svg width={size} height={size * 1.15} viewBox="0 0 40 46" aria-label={abbr} role="img" style={{ flexShrink: 0 }}>
      <defs>
        <clipPath id={id}>
          <path d="M20 1 L38 6 V22 C38 34 30 41 20 45 C10 41 2 34 2 22 V6 Z" />
        </clipPath>
      </defs>
      <g clipPath={`url(#${id})`}>
        <rect x="0" y="0" width="40" height="46" fill={a} />
        <rect x="0" y="29" width="40" height="17" fill={b} />
        <rect x="0" y="27" width="40" height="2" fill="rgba(0,0,0,0.25)" />
      </g>
      <path d="M20 1 L38 6 V22 C38 34 30 41 20 45 C10 41 2 34 2 22 V6 Z" fill="none" stroke="rgba(0,0,0,0.55)" strokeWidth="2" />
      <text
        x="20"
        y="20"
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize="11"
        fontWeight="800"
        fontFamily="Arial, sans-serif"
        fill={contrast(a)}
      >
        {abbr}
      </text>
    </svg>
  );
}

function contrast(hex: string): string {
  const n = parseInt(hex.slice(1), 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return r * 0.299 + g * 0.587 + b * 0.114 > 150 ? '#111' : '#fff';
}

export function Flag({ code, showCode = true }: { code: string; showCode?: boolean }) {
  return (
    <span className="flag" title={countryName(code)}>
      <span>{flagEmoji(code)}</span>
      {showCode && <span className="code">{code}</span>}
    </span>
  );
}

export const POS_LABEL: Record<Position, string> = { B: 'B', O: 'O', Z: 'Z', U: 'Ú' };
export const POS_NAME: Record<Position, string> = { B: 'Brankár', O: 'Obranca', Z: 'Záložník', U: 'Útočník' };

export function Pos({ p }: { p: Position }) {
  return <span className={`pos pos-${p}`}>{POS_LABEL[p]}</span>;
}

/** Farba podľa hodnoty atribútu */
export function attrColor(v: number): string {
  if (v >= 80) return '#4fc3f7';
  if (v >= 70) return '#6cc070';
  if (v >= 60) return '#c5d86d';
  if (v >= 50) return '#e0c050';
  if (v >= 40) return '#e09a50';
  return '#e06c6c';
}

export function Attr({ v }: { v: number }) {
  return (
    <span className="attr" style={{ color: attrColor(v) }}>
      {Math.round(v)}
    </span>
  );
}

const FORM_ARROWS = ['', '⬇', '↘', '➡', '↗', '⬆'];
const FORM_COLORS = ['', '#e06c6c', '#e09a50', '#9aa3ab', '#a5d06d', '#5cb85c'];

export function FormArrow({ form }: { form: number }) {
  const l = formLevel(form);
  return (
    <span className="form-arrow" style={{ color: FORM_COLORS[l] }} title={`Forma ${l}/5`}>
      {FORM_ARROWS[l]}
    </span>
  );
}

export function money(v: number): string {
  const abs = Math.abs(v);
  const sign = v < 0 ? '-' : '';
  if (abs >= 1_000_000) return `${sign}${(abs / 1_000_000).toLocaleString('sk-SK', { maximumFractionDigits: 2 })} mil. €`;
  if (abs >= 1_000) return `${sign}${Math.round(abs / 1_000).toLocaleString('sk-SK')} tis. €`;
  return `${sign}${Math.round(abs)} €`;
}

export function formatDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  return `${d}. ${m}. ${y}`;
}

// ---------- Zoraditeľná tabuľka ----------

export interface Column<T> {
  key: string;
  label: string;
  title?: string;
  render: (row: T) => ReactNode;
  /** Hodnota na zoraďovanie; ak chýba, stĺpec sa nedá zoradiť */
  sort?: (row: T) => number | string;
  className?: string;
  sticky?: boolean;
  /** Pri prvom kliknutí zoradiť od najväčšieho */
  desc?: boolean;
}

export function DataTable<T>({
  rows,
  columns,
  rowKey,
  onRowClick,
  initialSort,
  rowClass,
}: {
  rows: T[];
  columns: Column<T>[];
  rowKey: (row: T) => string;
  onRowClick?: (row: T) => void;
  initialSort?: { key: string; dir: 'asc' | 'desc' };
  rowClass?: (row: T) => string | undefined;
}) {
  const [sort, setSort] = useState(initialSort);

  const sorted = useMemo(() => {
    if (!sort) return rows;
    const col = columns.find((c) => c.key === sort.key);
    if (!col?.sort) return rows;
    const f = col.sort;
    const dir = sort.dir === 'asc' ? 1 : -1;
    return [...rows].sort((a, b) => {
      const va = f(a);
      const vb = f(b);
      if (typeof va === 'string' && typeof vb === 'string') return va.localeCompare(vb, 'sk') * dir;
      return ((va as number) - (vb as number)) * dir;
    });
  }, [rows, columns, sort]);

  const clickHeader = (c: Column<T>) => {
    if (!c.sort) return;
    if (sort?.key === c.key) setSort({ key: c.key, dir: sort.dir === 'asc' ? 'desc' : 'asc' });
    else setSort({ key: c.key, dir: c.desc ? 'desc' : 'asc' });
  };

  return (
    <div className="table-wrap">
      <table className="data">
        <thead>
          <tr>
            {columns.map((c) => (
              <th
                key={c.key}
                title={c.title}
                className={[c.className, c.sort && 'sortable', sort?.key === c.key && 'sorted', c.sticky && 'sticky']
                  .filter(Boolean)
                  .join(' ')}
                onClick={() => clickHeader(c)}
              >
                {c.label}
                {sort?.key === c.key ? (sort.dir === 'asc' ? ' ▲' : ' ▼') : ''}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((r) => (
            <tr
              key={rowKey(r)}
              className={[onRowClick && 'clickable', rowClass?.(r)].filter(Boolean).join(' ')}
              onClick={onRowClick ? () => onRowClick(r) : undefined}
            >
              {columns.map((c) => (
                <td key={c.key} className={[c.className, c.sticky && 'sticky'].filter(Boolean).join(' ')}>
                  {c.render(r)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function Modal({ onClose, children }: { onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} role="dialog">
        {children}
      </div>
    </div>
  );
}
