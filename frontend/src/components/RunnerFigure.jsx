import { useEffect, useState } from 'react';

const CHARACTERS = ['adventurer', 'female', 'player', 'soldier', 'zombie'];

const images = import.meta.glob('../assets/runners/*.png', { eager: true, import: 'default' });

function getImg(character, pose) {
  const key = `../assets/runners/${character}_${pose}.png`;
  return images[key];
}

function RunnerFigure({ index = 0, size = 60, victory = false }) {
  const character = CHARACTERS[index % CHARACTERS.length];
  const [frame, setFrame] = useState(1);

  useEffect(() => {
    if (victory) return;
    const interval = setInterval(() => {
      setFrame((f) => (f === 1 ? 2 : 1));
    }, 160);
    return () => clearInterval(interval);
  }, [victory]);

  const src = victory ? getImg(character, 'cheer1') : getImg(character, `walk${frame}`);

  return (
    <div style={{ width: size, height: size * 1.375, position: 'relative' }}>
      <img
        src={src}
        alt={character}
        style={{ width: '100%', height: '100%', objectFit: 'contain' }}
      />
      {victory && (
        <span
          className="absolute -top-2 left-1/2 -translate-x-1/2 text-lg"
          style={{ filter: 'drop-shadow(0 2px 3px rgba(0,0,0,0.3))' }}
        >
          🏆
        </span>
      )}
    </div>
  );
}

export default RunnerFigure;