import { useCallback, useState } from 'react';
import { AUTOSAVE_SLOT, saveGame } from './engine/save';
import type { GameState } from './engine/types';
import { GameContext } from './ui/GameContext';
import { GameShell } from './ui/GameShell';
import { MainMenu } from './ui/MainMenu';

export default function App() {
  const [state, setStateRaw] = useState<GameState | null>(null);

  // Každá zmena stavu sa automaticky uloží
  const setState = useCallback((s: GameState) => {
    setStateRaw(s);
    saveGame(s, AUTOSAVE_SLOT, 'Automatické uloženie').catch(console.error);
  }, []);

  if (!state) return <MainMenu onStart={setState} />;

  return (
    <GameContext.Provider value={{ state, setState, quit: () => setStateRaw(null) }}>
      <GameShell />
    </GameContext.Provider>
  );
}
