// Navigácia v hre – otvorenie stránky klubu odkiaľkoľvek

import { createContext, useContext } from 'react';
import { useGame } from './GameContext';
import { ClubBadge } from './common';

export const NavContext = createContext<{ openClub: (id: string) => void }>({ openClub: () => {} });

export function useNav() {
  return useContext(NavContext);
}

/** Klikateľný názov klubu s logom */
export function ClubLink({ id, size = 18, full = false, bold = false, badge = true }: { id: string; size?: number; full?: boolean; bold?: boolean; badge?: boolean }) {
  const { state } = useGame();
  const { openClub } = useNav();
  const c = state.clubs[id];
  if (!c) return null;
  return (
    <button
      className="link club-cell"
      style={{ fontWeight: bold ? 700 : undefined }}
      onClick={(e) => {
        e.stopPropagation();
        openClub(id);
      }}
    >
      {badge && <ClubBadge club={c} size={size} />}
      {full ? c.name : c.shortName}
    </button>
  );
}
