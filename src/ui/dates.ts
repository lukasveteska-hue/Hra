import { weekdayName } from '../engine/calendar';

/** napr. "so 25. 7." */
export function formatDateShort(iso: string): string {
  const [, m, d] = iso.split('-').map(Number);
  return `${weekdayName(iso).slice(0, 2)} ${d}. ${m}.`;
}
