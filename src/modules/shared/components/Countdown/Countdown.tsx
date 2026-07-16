import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import './Countdown.css';

interface CountdownProps {
  onComplete: () => void;
}

function playBeep(frequency: number, duration: number) {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = frequency;
    osc.type = 'sine';
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);
    osc.start();
    osc.stop(ctx.currentTime + duration);
  } catch { /* silent fail */ }
}

export default function Countdown({ onComplete }: CountdownProps) {
  const [count, setCount] = useState(3);

  useEffect(() => {
    // Play sound for each count
    if (count > 0) {
      playBeep(440 + (3 - count) * 100, 0.3); // ascending pitch: 440, 540, 640
    } else {
      playBeep(880, 0.5); // GO! high pitch
    }
  }, [count]);

  useEffect(() => {
    if (count === 0) {
      const timeout = setTimeout(onComplete, 600);
      return () => clearTimeout(timeout);
    }
    const interval = setTimeout(() => setCount(count - 1), 800);
    return () => clearTimeout(interval);
  }, [count, onComplete]);

  return (
    <div className="countdown">
      <AnimatePresence mode="wait">
        <motion.div
          key={count}
          className={`countdown__number ${count === 0 ? 'countdown__number--go' : ''}`}
          initial={{ scale: 0.3, opacity: 0, rotateZ: -10 }}
          animate={{ scale: 1, opacity: 1, rotateZ: 0 }}
          exit={{ scale: 2, opacity: 0 }}
          transition={{ duration: 0.4, ease: 'backOut' }}
        >
          {count > 0 ? count : '¡GO!'}
        </motion.div>
      </AnimatePresence>
      <motion.p
        className="countdown__hint"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
      >
        Prepárate...
      </motion.p>
    </div>
  );
}
