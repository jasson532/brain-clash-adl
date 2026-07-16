import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import './HomePage.css';

export default function HomePage() {
  const navigate = useNavigate();

  return (
    <div className="home">
      <motion.div
        className="home__content"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
      >
        <motion.div
          className="home__logo"
          animate={{ rotateY: [0, 360] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
        >
          🧠
        </motion.div>

        <h1 className="home__title">
          <span className="home__title-game">BRAIN</span>
          <span className="home__title-day">CLASH</span>
        </h1>

        <p className="home__subtitle">ADL Team Challenge</p>
        <p className="home__description">
          Compite en trivia épica. Solo o con tu equipo. ¿Quién tiene el cerebro más rápido?
        </p>

        {/* Mode selection */}
        <div className="home__modes">
          <motion.button
            className="home__mode-card home__mode-card--team"
            onClick={() => navigate('/gamedays')}
            whileHover={{ scale: 1.03, y: -5 }}
            whileTap={{ scale: 0.97 }}
          >
            <span className="home__mode-icon">⚔️</span>
            <h3 className="home__mode-title">Modo Equipos</h3>
            <p className="home__mode-desc">
              Crea un GameDay, arma equipos y compite con tu squad en tiempo real
            </p>
            <span className="home__mode-badge">🔥 Recomendado</span>
          </motion.button>

          <motion.button
            className="home__mode-card home__mode-card--tournament"
            onClick={() => navigate('/tournaments')}
            whileHover={{ scale: 1.03, y: -5 }}
            whileTap={{ scale: 0.97 }}
          >
            <span className="home__mode-icon">🏆</span>
            <h3 className="home__mode-title">Modo Torneo</h3>
            <p className="home__mode-desc">
              Eliminación directa estilo Mundial. 8, 16 o 32 equipos hasta el campeón
            </p>
            <span className="home__mode-badge home__mode-badge--new">🆕 Nuevo</span>
          </motion.button>

          <motion.button
            className="home__mode-card home__mode-card--solo"
            onClick={() => navigate('/solo')}
            whileHover={{ scale: 1.03, y: -5 }}
            whileTap={{ scale: 0.97 }}
          >
            <span className="home__mode-icon">🎯</span>
            <h3 className="home__mode-title">Modo Solo</h3>
            <p className="home__mode-desc">
              Juega por tu cuenta, elige categoría y dificultad a tu gusto
            </p>
          </motion.button>
        </div>

        <p className="home__footer">
          Hecho con 💜 por ADL
        </p>
      </motion.div>
    </div>
  );
}
