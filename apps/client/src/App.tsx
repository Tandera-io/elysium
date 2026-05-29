import { useEffect, useState } from 'react';
import { GameScreen } from './components/GameScreen';
import { SaveMenu } from './ui/SaveMenu';
import { TitleScreen } from './ui/TitleScreen';
import { useTimeStore } from './systems/time/timeStore';

export function App() {
  const [titleOpen, setTitleOpen] = useState(true);
  const [saveOpen, setSaveOpen] = useState(false);

  useEffect(() => {
    useTimeStore.getState().setPaused(titleOpen);
  }, [titleOpen]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.code === 'KeyS') {
        e.preventDefault();
        setSaveOpen(true);
      }
      if (e.code === 'Escape' && !titleOpen && !saveOpen) {
        setSaveOpen(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [titleOpen, saveOpen]);

  return (
    <main className="h-screen w-screen overflow-hidden relative bg-slate-900">
      <GameScreen onOpenMenu={() => setSaveOpen(true)} />
      <SaveMenu open={saveOpen} onClose={() => setSaveOpen(false)} />
      {titleOpen && <TitleScreen onStart={() => setTitleOpen(false)} />}
    </main>
  );
}
