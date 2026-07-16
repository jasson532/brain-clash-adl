import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import ConfettiExplosion from 'react-confetti-explosion';
import type { Player } from 'modules/shared/types/game.types';
import { useSound } from 'modules/shared/hooks/useSound';
import './ResultsPage.css';

interface ResultsPageProps {
  player: Player;
  totalQuestions: number;
  onPlayAgain: () => void;
  onGoHome: () => void;
}

export default function ResultsPage({
  player,
  totalQuestions,
  onPlayAgain,
  onGoHome,
}: ResultsPageProps) {
  const [showConfetti, setShowConfetti] = useState(false);
  const { playVictory, playGameOver } = useSound();
  const accuracy = Math.round((player.correctAnswers / totalQuestions) * 100);

  const getRank = () => {
    if (accuracy >= 90) return { title: '🏆 LEYENDA', color: 'var(--warning)', message: '¡Eres imparable!' };
    if (accuracy >= 70) return { title: '⭐ EXPERTO', color: 'var(--primary)', message: '¡Impresionante conocimiento!' };
    if (accuracy >= 50) return { title: '💪 GUERRERO', color: 'var(--secondary)', message: '¡Buen trabajo, sigue así!' };
    if (accuracy >= 30) return { title: '🌱 APRENDIZ', color: 'var(--success)', message: 'Cada intento te hace más fuerte' };
    return { title: '🎲 NOVATO', color: 'var(--text-secondary)', message: '¡La próxima será mejor!' };
  };

  const rank = getRank();

  useEffect(() => {
    if (accuracy >= 70) {
      setShowConfetti(true);
      playVictory();
    } else {
      playGameOver();
    }
  }, [accuracy, playVictory, playGameOver]);

  return (
    <div className="results">
      {showConfetti && (
        <div className="results__confetti">
          <ConfettiExplosion
            force={0.8}
            duration={3000}
            particleCount={150}
            width={1600}
          />
        </div>
      )}

      <motion.div
        className="results__card"
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, type: 'spring' }}
      >
        {/* Rank */}
        <motion.div
          className="results__rank"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <h1 className="results__rank-title" style={{ color: rank.color }}>
            {rank.title}
          </h1>
          <p className="results__rank-message">{rank.message}</p>
        </motion.div>

        {/* Score circle */}
        <motion.div
          className="results__score-circle"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.5, type: 'spring', stiffness: 200 }}
        >
          <svg className="results__score-svg" viewBox="0 0 120 120">
            <circle
              className="results__score-bg"
              cx="60"
              cy="60"
              r="54"
            />
            <motion.circle
              className="results__score-progress"
              cx="60"
              cy="60"
              r="54"
              style={{ stroke: rank.color }}
              initial={{ strokeDashoffset: 2 * Math.PI * 54 }}
              animate={{ strokeDashoffset: 2 * Math.PI * 54 * (1 - accuracy / 100) }}
              transition={{ delay: 0.8, duration: 1.5, ease: 'easeOut' }}
            />
          </svg>
          <div className="results__score-text">
            <span className="results__score-value">{accuracy}%</span>
            <span className="results__score-label">Precisión</span>
          </div>
        </motion.div>

        {/* Stats grid */}
        <motion.div
          className="results__stats"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
        >
          <div className="results__stat">
            <span className="results__stat-icon">⭐</span>
            <span className="results__stat-value">{player.score.toLocaleString()}</span>
            <span className="results__stat-label">Puntos</span>
          </div>
          <div className="results__stat">
            <span className="results__stat-icon">✅</span>
            <span className="results__stat-value">{player.correctAnswers}</span>
            <span className="results__stat-label">Correctas</span>
          </div>
          <div className="results__stat">
            <span className="results__stat-icon">❌</span>
            <span className="results__stat-value">{totalQuestions - player.correctAnswers}</span>
            <span className="results__stat-label">Incorrectas</span>
          </div>
          <div className="results__stat">
            <span className="results__stat-icon">🔥</span>
            <span className="results__stat-value">{player.streak}</span>
            <span className="results__stat-label">Mejor racha</span>
          </div>
        </motion.div>

        {/* Actions */}
        <motion.div
          className="results__actions"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
        >
          <motion.button
            className="results__btn results__btn--primary"
            onClick={onPlayAgain}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            🔄 Jugar de nuevo
          </motion.button>
          <motion.button
            className="results__btn results__btn--secondary"
            onClick={onGoHome}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            🏠 Inicio
          </motion.button>
        </motion.div>
      </motion.div>
    </div>
  );
}
