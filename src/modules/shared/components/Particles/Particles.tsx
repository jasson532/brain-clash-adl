import { motion } from 'framer-motion';
import './Particles.css';

export default function Particles() {
  return (
    <div className="particles">
      {Array.from({ length: 120 }).map((_, i) => (
        <motion.div
          key={i}
          className="particles__dot"
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: [0, 0.7, 0], y: [-10, -400] }}
          transition={{ duration: 3 + Math.random() * 3, repeat: Infinity, delay: Math.random() * 5 }}
          style={{ left: `${Math.random() * 100}%`, bottom: '0%' }}
        />
      ))}
    </div>
  );
}
