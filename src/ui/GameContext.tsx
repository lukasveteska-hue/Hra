// Zdieľaný stav hry pre všetky obrazovky

import { createContext, useContext } from 'react';
import type { GameState } from '../engine/types';

export interface GameCtx {
  state: GameState;
  setState: (s: GameState) => void;
  quit: () => void;
}

export const GameContext = createContext<GameCtx | null>(null);

export function useGame(): GameCtx {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error('useGame mimo GameContext');
  return ctx;
}
