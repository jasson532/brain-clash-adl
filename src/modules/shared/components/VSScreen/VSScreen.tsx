import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import './VSScreen.css';

interface VSScreenProps {
  teamAName: string;
  teamAAvatar: string;
  teamAColor: string;
  teamBName: string;
  teamBAvatar: string;
  teamBColor: string;
  onComplete: () => void;
}

function playWhoosh() {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(150, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(600, ctx.currentTime + 0.15);
    osc.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + 0.4);
    filter.type = 'lowpass';
    filter.frequency.value = 2000;
    gain.gain.setValueAtTime(0.25, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
    osc.start();
    osc.stop(ctx.currentTime + 0.5);
  } catch { /* silent fail */ }
}

function playImpact() {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'square';
    osc.frequency.setValueAtTime(200, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(50, ctx.currentTime + 0.3);
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
    osc.start();
    osc.stop(ctx.currentTime + 0.4);
  } catch { /* silent fail */ }
}

export default function VSScreen({ teamAName, teamAAvatar, teamAColor, teamBName, teamBAvatar, teamBColor, onComplete }: VSScreenProps) {
  const [phase, setPhase] = useState<'enter' | 'vs' | 'exit'>('enter');

  useEffect(() => {
    playWhoosh(); // whoosh on enter
    const t1 = setTimeout(() => { setPhase('vs'); playImpact(); }, 400); // impact on VS appear
    const t2 = setTimeout(() => setPhase('exit'), 1800);
    const t3 = setTimeout(onComplete, 2200);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [onComplete]);

  return (
    <div className={`vs-screen vs-screen--${phase}`}>
      {/* Team A */}
      <motion.div
        className="vs-screen__team vs-screen__team--left"
        initial={{ x: '-100%', opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: 'backOut' }}
      >
        <span className="vs-screen__avatar">{teamAAvatar}</span>
        <h2 className="vs-screen__name" style={{ color: teamAColor }}>{teamAName}</h2>
      </motion.div>

      {/* VS */}
      <motion.div
        className="vs-screen__center"
        initial={{ scale: 0, rotate: -180 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ delay: 0.4, duration: 0.5, type: 'spring', stiffness: 200 }}
      >
        <span className="vs-screen__bolt">⚡</span>
        <span className="vs-screen__vs">VS</span>
        <span className="vs-screen__bolt">⚡</span>
      </motion.div>

      {/* Team B */}
      <motion.div
        className="vs-screen__team vs-screen__team--right"
        initial={{ x: '100%', opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: 'backOut' }}
      >
        <span className="vs-screen__avatar">{teamBAvatar}</span>
        <h2 className="vs-screen__name" style={{ color: teamBColor }}>{teamBName}</h2>
      </motion.div>
    </div>
  );
}
