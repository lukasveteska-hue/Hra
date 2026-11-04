// Jednoduché grafy v SVG (čiarový a stĺpcový) s popisom pri prejdení myšou / prstom

import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';

/** Farby sérií – overené pre tmavé pozadie (aj pre poruchy farebného videnia) */
export const SERIES = ['#3987e5', '#d95926', '#199e70', '#c98500', '#d55181', '#9085e9'];
export const POSITIVE = '#3987e5';
export const NEGATIVE = '#d95926';

function useWidth<T extends HTMLElement>(): [React.RefObject<T | null>, number] {
  const ref = useRef<T>(null);
  const [w, setW] = useState(0);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    setW(Math.max(240, el.getBoundingClientRect().width));
    const ro = new ResizeObserver(([e]) => setW(Math.max(240, e.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, w];
}

function niceTicks(min: number, max: number, count = 5): number[] {
  if (min === max) return [min];
  const span = max - min;
  const step0 = span / count;
  const mag = 10 ** Math.floor(Math.log10(step0));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => span / s <= count) ?? mag * 10;
  const start = Math.ceil(min / step) * step;
  const ticks: number[] = [];
  for (let v = start; v <= max + 1e-9; v += step) ticks.push(Math.round(v * 1e6) / 1e6);
  return ticks;
}

export interface LineSeries {
  name: string;
  color: string;
  values: Array<number | null>;
  /** Hrubšia čiara (napr. môj klub) */
  emphasis?: boolean;
}

export function LineChart({
  series,
  xLabels,
  height = 240,
  invert = false,
  yMin,
  yMax,
  format = (v) => String(v),
  integerTicks = false,
}: {
  series: LineSeries[];
  xLabels: string[];
  height?: number;
  /** Menšie číslo hore (napr. umiestnenie v tabuľke) */
  invert?: boolean;
  yMin?: number;
  yMax?: number;
  format?: (v: number) => string;
  integerTicks?: boolean;
}) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const n = xLabels.length;
  if (!width) return <div ref={ref} className="chart" style={{ height }} />;
  const all = series.flatMap((s) => s.values.filter((v): v is number => v !== null));
  if (!n || !all.length) return <div className="muted">Zatiaľ bez údajov.</div>;
  const lo = yMin ?? Math.min(...all);
  const hi = yMax ?? Math.max(...all);
  const pad = { l: 52, r: series.length <= 4 && series.length > 1 ? 70 : 14, t: 12, b: 26 };
  const w = width - pad.l - pad.r;
  const h = height - pad.t - pad.b;
  const x = (i: number) => pad.l + (n === 1 ? w / 2 : (i / (n - 1)) * w);
  const span = hi - lo || 1;
  const y = (v: number) => pad.t + (invert ? (v - lo) / span : 1 - (v - lo) / span) * h;
  let ticks = niceTicks(lo, hi, 5);
  if (integerTicks) ticks = ticks.filter((t) => Number.isInteger(t));
  // Pri umiestnení vždy ukázať aj 1. miesto
  if (invert && yMin !== undefined && !ticks.includes(yMin)) ticks = [yMin, ...ticks];
  const xStep = Math.ceil(n / Math.max(2, Math.floor(w / 60)));

  const onMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const px = e.clientX - r.left;
    const i = Math.round(((px - pad.l) / w) * (n - 1));
    setHover(Math.max(0, Math.min(n - 1, i)));
  };

  return (
    <div ref={ref} className="chart">
      {series.length > 1 && (
        <div className="legend">
          {series.map((s) => (
            <span key={s.name}>
              <i style={{ background: s.color }} />
              {s.name}
            </span>
          ))}
        </div>
      )}
      <div style={{ position: 'relative' }}>
        <svg width={width} height={height} onPointerMove={onMove} onPointerLeave={() => setHover(null)} style={{ touchAction: 'pan-y' }}>
          {ticks.map((t) => (
            <g key={t}>
              <line x1={pad.l} x2={pad.l + w} y1={y(t)} y2={y(t)} className="grid" />
              <text x={pad.l - 6} y={y(t)} className="axis" textAnchor="end" dominantBaseline="middle">
                {format(t)}
              </text>
            </g>
          ))}
          {xLabels.map((l, i) =>
            i % xStep === 0 || i === n - 1 ? (
              <text key={i} x={x(i)} y={height - 6} className="axis" textAnchor="middle">
                {l}
              </text>
            ) : null,
          )}
          {series.map((s) => {
            const pts = s.values.map((v, i) => (v === null ? null : `${x(i)},${y(v)}`)).filter(Boolean);
            return (
              <polyline
                key={s.name}
                points={pts.join(' ')}
                fill="none"
                stroke={s.color}
                strokeWidth={s.emphasis ? 3 : 2}
                strokeLinejoin="round"
                strokeLinecap="round"
                opacity={series.some((x) => x.emphasis) && !s.emphasis ? 0.75 : 1}
              />
            );
          })}
          {/* Priame popisy na konci čiar */}
          {series.length > 1 &&
            series.length <= 4 &&
            series.map((s) => {
              const lastI = s.values.map((v, i) => (v === null ? -1 : i)).filter((i) => i >= 0).pop();
              if (lastI === undefined) return null;
              return (
                <text key={s.name} x={x(lastI) + 6} y={y(s.values[lastI]!)} className="direct-label" dominantBaseline="middle">
                  {s.name.length > 10 ? s.name.slice(0, 9) + '…' : s.name}
                </text>
              );
            })}
          {hover !== null && (
            <g>
              <line x1={x(hover)} x2={x(hover)} y1={pad.t} y2={pad.t + h} className="crosshair" />
              {series.map((s) =>
                s.values[hover] === null ? null : (
                  <circle key={s.name} cx={x(hover)} cy={y(s.values[hover]!)} r={4.5} fill={s.color} stroke="var(--panel)" strokeWidth={2} />
                ),
              )}
            </g>
          )}
        </svg>
        {hover !== null && (
          <Tooltip x={x(hover)} width={width}>
            <div className="tt-title">{xLabels[hover]}</div>
            {series
              .filter((s) => s.values[hover] !== null)
              .sort((a, b) => (invert ? a.values[hover]! - b.values[hover]! : b.values[hover]! - a.values[hover]!))
              .slice(0, 8)
              .map((s) => (
                <div key={s.name} className="tt-row">
                  <i style={{ background: s.color }} />
                  <span>{s.name}</span>
                  <strong>{format(s.values[hover]!)}</strong>
                </div>
              ))}
          </Tooltip>
        )}
      </div>
    </div>
  );
}

function Tooltip({ x, width, children }: { x: number; width: number; children: ReactNode }) {
  const left = x > width / 2 ? undefined : x + 12;
  const right = x > width / 2 ? width - x + 12 : undefined;
  return (
    <div className="tooltip" style={{ left, right, top: 8 }}>
      {children}
    </div>
  );
}

export interface BarItem {
  label: string;
  value: number;
  /** Text v popise */
  detail?: string;
}

/** Stĺpcový graf; záporné hodnoty idú pod nulu inou farbou */
export function BarChart({
  items,
  height = 220,
  format = (v) => String(v),
  color = POSITIVE,
  negativeColor = NEGATIVE,
}: {
  items: BarItem[];
  height?: number;
  format?: (v: number) => string;
  color?: string;
  negativeColor?: string;
}) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  if (!items.length) return <div className="muted">Zatiaľ bez údajov.</div>;
  if (!width) return <div ref={ref} className="chart" style={{ height }} />;
  const pad = { l: 56, r: 10, t: 12, b: 28 };
  const w = width - pad.l - pad.r;
  const h = height - pad.t - pad.b;
  const lo = Math.min(0, ...items.map((i) => i.value));
  const hi = Math.max(0, ...items.map((i) => i.value));
  const span = hi - lo || 1;
  const y = (v: number) => pad.t + (1 - (v - lo) / span) * h;
  const slot = w / items.length;
  const bw = Math.max(3, Math.min(42, slot - 2));
  const ticks = niceTicks(lo, hi, 4);
  const xStep = Math.ceil(items.length / Math.max(2, Math.floor(w / 48)));

  return (
    <div ref={ref} className="chart">
      <div style={{ position: 'relative' }}>
        <svg width={width} height={height} onPointerLeave={() => setHover(null)}>
          {ticks.map((t) => (
            <g key={t}>
              <line x1={pad.l} x2={pad.l + w} y1={y(t)} y2={y(t)} className={t === 0 ? 'zero' : 'grid'} />
              <text x={pad.l - 6} y={y(t)} className="axis" textAnchor="end" dominantBaseline="middle">
                {format(t)}
              </text>
            </g>
          ))}
          {items.map((it, i) => {
            const cx = pad.l + slot * i + slot / 2;
            const top = y(Math.max(0, it.value));
            const bh = Math.max(1, Math.abs(y(it.value) - y(0)));
            const neg = it.value < 0;
            return (
              <g key={i} onPointerEnter={() => setHover(i)} onPointerDown={() => setHover(i)}>
                <rect x={pad.l + slot * i} y={pad.t} width={slot} height={h} fill="transparent" />
                <path d={barPath(cx - bw / 2, top, bw, bh, neg)} fill={neg ? negativeColor : color} opacity={hover === null || hover === i ? 1 : 0.55} />
                {(i % xStep === 0 || i === items.length - 1) && (
                  <text x={cx} y={height - 8} className="axis" textAnchor="middle">
                    {it.label}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
        {hover !== null && (
          <Tooltip x={pad.l + slot * hover + slot / 2} width={width}>
            <div className="tt-title">{items[hover].label}</div>
            <div className="tt-row">
              <strong>{format(items[hover].value)}</strong>
            </div>
            {items[hover].detail && <div className="tt-detail">{items[hover].detail}</div>}
          </Tooltip>
        )}
      </div>
    </div>
  );
}

/** Stĺpec so zaobleným koncom (4 px) na strane hodnoty, rovný pri nule */
function barPath(x: number, y: number, w: number, h: number, negative: boolean): string {
  const r = Math.min(4, w / 2, h);
  if (!negative) {
    return `M${x},${y + h} V${y + r} Q${x},${y} ${x + r},${y} H${x + w - r} Q${x + w},${y} ${x + w},${y + r} V${y + h} Z`;
  }
  return `M${x},${y} V${y + h - r} Q${x},${y + h} ${x + r},${y + h} H${x + w - r} Q${x + w},${y + h} ${x + w},${y + h - r} V${y} Z`;
}

/** Vodorovné pruhy (napr. príjmy podľa druhu) */
export function HBars({ items, format, color = POSITIVE }: { items: BarItem[]; format: (v: number) => string; color?: string }) {
  const max = Math.max(1, ...items.map((i) => Math.abs(i.value)));
  return (
    <div className="hbars">
      {items.map((it) => (
        <div key={it.label} className="hbar" title={it.detail}>
          <span className="hb-label">{it.label}</span>
          <div className="hb-track">
            <div className="hb-fill" style={{ width: `${(Math.abs(it.value) / max) * 100}%`, background: it.value < 0 ? NEGATIVE : color }} />
          </div>
          <span className="hb-val num">{format(it.value)}</span>
        </div>
      ))}
    </div>
  );
}
