import { useCallback, useRef } from 'react';

// Simple sound effects using Web Audio API
export function useSound() {
  const audioContextRef = useRef<AudioContext | null>(null);

  const getContext = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext();
    }
    return audioContextRef.current;
  }, []);

  const playTone = useCallback(
    (frequency: number, duration: number, type: OscillatorType = 'sine') => {
      try {
        const ctx = getContext();
        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);

        oscillator.type = type;
        oscillator.frequency.setValueAtTime(frequency, ctx.currentTime);
        gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);

        oscillator.start(ctx.currentTime);
        oscillator.stop(ctx.currentTime + duration);
      } catch {
        // Audio not available, silently fail
      }
    },
    [getContext],
  );

  const playCorrect = useCallback(() => {
    playTone(523.25, 0.1, 'sine');
    setTimeout(() => playTone(659.25, 0.1, 'sine'), 100);
    setTimeout(() => playTone(783.99, 0.2, 'sine'), 200);
  }, [playTone]);

  const playWrong = useCallback(() => {
    playTone(200, 0.3, 'sawtooth');
  }, [playTone]);

  const playTick = useCallback(() => {
    playTone(800, 0.05, 'square');
  }, [playTone]);

  const playGameOver = useCallback(() => {
    playTone(523.25, 0.2, 'sine');
    setTimeout(() => playTone(392, 0.2, 'sine'), 200);
    setTimeout(() => playTone(329.63, 0.2, 'sine'), 400);
    setTimeout(() => playTone(261.63, 0.4, 'sine'), 600);
  }, [playTone]);

  const playVictory = useCallback(() => {
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((note, i) => {
      setTimeout(() => playTone(note, 0.15, 'sine'), i * 120);
    });
  }, [playTone]);

  return { playCorrect, playWrong, playTick, playGameOver, playVictory };
}
