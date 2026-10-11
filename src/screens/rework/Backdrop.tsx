import { useEffect, useRef, useState } from 'react';
import { Cinematic } from '../../game/rework/cinematic';
import type { HouseV1 } from '../../../shared/house/format';
export function Backdrop({
  mode,
  house,
}: {
  mode: 'loading' | 'menu' | 'results';
  house?: HouseV1;
}) {
  const host = useRef<HTMLDivElement>(null),
    [error, setError] = useState('');
  useEffect(() => {
    try {
      const c = new Cinematic(host.current!, mode, house);
      return () => c.dispose();
    } catch {
      setError(
        '3D rendering is unavailable. Enable hardware acceleration and reload.',
      );
    }
  }, [mode, house]);
  return (
    <>
      <div className="hl-world" ref={host} />
      {error && (
        <p className="hl-error" role="alert">
          {error}
        </p>
      )}
    </>
  );
}
