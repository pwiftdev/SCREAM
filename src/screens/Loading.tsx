import { useEffect, useState } from 'react';
import { CHARACTERS } from '../../shared/config';
const tips = [
  'two voices together can stop him. save your scream for company.',
  'running leaves tracks. walk when the bell gets close.',
  'one generator at a time. one more reason to get home.',
  'a cage is not the end. someone can still come for you.',
];
export function Loading() {
  const [tip, setTip] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setTip((n) => (n + 1) % tips.length), 3500);
    return () => clearInterval(timer);
  }, []);
  return (
    <div className="loading">
      <p className="eyebrow">SOMEWHERE AT THE END OF THE ROAD</p>
      <h1>ROTTEN HOLLOW.</h1>
      <p>{tips[tip]}</p>
      <div className="loading-track">
        <i />
      </div>
      <div className="loading-cast">
        {[...CHARACTERS, 'The Hollow'].map((name, i) => (
          <div key={name}>
            <img src={`/assets/portraits/${i}.png`} alt="" />
            <span>{name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
