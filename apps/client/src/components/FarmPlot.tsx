import { useEffect } from 'react';
import { FarmGrid } from '../farming/FarmGrid';

interface FarmPlotProps {
  onClose: () => void;
}

export function FarmPlot({ onClose }: FarmPlotProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Escape' || e.code === 'KeyF') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return <FarmGrid asOverlay onClose={onClose} />;
}
