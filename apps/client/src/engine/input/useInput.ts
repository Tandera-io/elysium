import { useEffect, useRef } from 'react';

export interface InputState {
  w: boolean;
  a: boolean;
  s: boolean;
  d: boolean;
}

const KEYS_DOWN: Partial<Record<string, keyof InputState>> = {
  KeyW: 'w',
  KeyA: 'a',
  KeyS: 's',
  KeyD: 'd',
  ArrowUp: 'w',
  ArrowLeft: 'a',
  ArrowDown: 's',
  ArrowRight: 'd',
};

/**
 * Listens to keyboard events on `window` and updates a ref-bound state object.
 * Returns a ref (not state) to avoid re-renders every frame; the consumer reads
 * `ref.current` inside an R3F useFrame.
 */
export function useInputRef(): React.MutableRefObject<InputState> {
  const ref = useRef<InputState>({ w: false, a: false, s: false, d: false });

  useEffect(() => {
    const onDown = (e: KeyboardEvent) => {
      const key = KEYS_DOWN[e.code];
      if (key) {
        ref.current[key] = true;
      }
    };
    const onUp = (e: KeyboardEvent) => {
      const key = KEYS_DOWN[e.code];
      if (key) {
        ref.current[key] = false;
      }
    };
    const onBlur = () => {
      ref.current.w = false;
      ref.current.a = false;
      ref.current.s = false;
      ref.current.d = false;
    };

    window.addEventListener('keydown', onDown);
    window.addEventListener('keyup', onUp);
    window.addEventListener('blur', onBlur);

    return () => {
      window.removeEventListener('keydown', onDown);
      window.removeEventListener('keyup', onUp);
      window.removeEventListener('blur', onBlur);
    };
  }, []);

  return ref;
}
