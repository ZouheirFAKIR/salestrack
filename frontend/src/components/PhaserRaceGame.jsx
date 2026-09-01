import { useEffect, useRef } from 'react';
import Phaser from 'phaser';
import RaceScene from '../game/RaceScene';

function PhaserRaceGame({ runners }) {
  const containerRef = useRef(null);
  const gameRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current || gameRef.current) return;

    const el = containerRef.current;
    const rect = el.getBoundingClientRect();

    const game = new Phaser.Game({
      type: Phaser.AUTO,
      parent: el,
      transparent: true,
      width: Math.max(rect.width, 300),
      height: Math.max(rect.height, 300),
      scale: {
        mode: Phaser.Scale.RESIZE,
      },
      scene: RaceScene,
    });

    gameRef.current = game;

    const resizeObserver = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const { width, height } = entry.contentRect;
      if (width > 0 && height > 0) {
        game.scale.resize(width, height);
      }
    });
    resizeObserver.observe(el);

    return () => {
      resizeObserver.disconnect();
      game.destroy(true);
      gameRef.current = null;
    };
  }, []);

  useEffect(() => {
    const scene = gameRef.current?.scene.getScene('RaceScene');
    if (scene && runners) {
      scene.updateRunners(runners);
    }
  }, [runners]);

  return <div ref={containerRef} className="w-full h-full rounded-3xl overflow-hidden shadow-2xl" style={{ border: '1px solid rgba(0,0,0,0.15)' }} />;
}

export default PhaserRaceGame;