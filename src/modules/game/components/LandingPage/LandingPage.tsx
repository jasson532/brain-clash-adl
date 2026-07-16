import { motion } from 'framer-motion';
import './LandingPage.css';

interface LandingPageProps {
  onStart: () => void;
}

export default function LandingPage({ onStart }: LandingPageProps) {
  return (
    <div className="landing">
      {/* Floating particles */}
      <div className="landing__particles">
        {Array.from({ length: 20 }).map((_, i) => (
          <motion.div
            key={i}
            className="landing__particle"
            initial={{ opacity: 0, y: 100 }}
            animate={{
              opacity: [0, 1, 0],
              y: [-20, -200],
              x: Math.random() * 40 - 20,
            }}
            transition={{
              duration: 3 + Math.random() * 2,
              repeat: Infinity,
              delay: Math.random() * 3,
            }}
            style={{
              left: `${Math.random() * 100}%`,
              bottom: '0%',
            }}
          />
        ))}
      </div>

      <motion.div
        className="landing__content"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
      >
        {/* Logo / Icon */}
        <motion.div
          className="landing__logo"
          animate={{ rotateY: [0, 360] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
        >
          🎮
        </motion.div>

        {/* Title */}
        <motion.h1
          className="landing__title"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3, duration: 0.6 }}
        >
          <span className="landing__title-game">GAME</span>
          <span className="landing__title-day">DAY</span>
        </motion.h1>

        <motion.p
          className="landing__subtitle"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
        >
          ADL Team Challenge
        </motion.p>

        <motion.p
          className="landing__description"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
        >
          Compite con tu equipo en retos de trivia épicos.
          <br />
          Demuestra quién sabe más en esta batalla de conocimiento.
        </motion.p>

        {/* Stats */}
        <motion.div
          className="landing__stats"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1 }}
        >
          <div className="landing__stat">
            <span className="landing__stat-value">19+</span>
            <span className="landing__stat-label">Categorías</span>
          </div>
          <div className="landing__stat-divider" />
          <div className="landing__stat">
            <span className="landing__stat-value">∞</span>
            <span className="landing__stat-label">Preguntas</span>
          </div>
          <div className="landing__stat-divider" />
          <div className="landing__stat">
            <span className="landing__stat-value">3</span>
            <span className="landing__stat-label">Dificultades</span>
          </div>
        </motion.div>

        {/* CTA Button */}
        <motion.button
          className="landing__cta"
          onClick={onStart}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 1.2 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <span className="landing__cta-text">INICIAR GAMEDAY</span>
          <span className="landing__cta-icon">⚡</span>
        </motion.button>

        {/* Footer */}
        <motion.p
          className="landing__footer"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5 }}
        >
          Hecho con 💜 por ADL
        </motion.p>
      </motion.div>
    </div>
  );
}
