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
    setStateRaw((prev) => {
      // Pri začatí alebo načítaní hry ísť na začiatok stránky
      if (!prev) window.scrollTo(0, 0);
      return s;
    });
    saveGame(s, AUTOSAVE_SLOT, 'Automatické uloženie').catch(console.error);
  }, []);

  if (!state) return <MainMenu onStart={setState} />;

  return (
    <GameContext.Provider value={{ state, setState, quit: () => setStateRaw(null) }}>
      <GameShell />
    </GameContext.Provider>
  );
}
