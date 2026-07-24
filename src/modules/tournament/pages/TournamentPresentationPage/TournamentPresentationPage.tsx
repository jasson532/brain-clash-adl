import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import './TournamentPresentationPage.css';

const SLIDES = [
  {
    icon: '🧠',
    title: 'BRAIN CLASH ADL',
    subtitle: 'Torneo de Eliminación Directa',
    content: 'Bienvenidos al torneo de trivia más épico. Equipos compiten cabeza a cabeza hasta que solo quede un campeón.',
    highlight: null,
  },
  {
    icon: '⚔️',
    title: '¿Cómo funciona?',
    subtitle: 'Eliminación directa estilo Mundial',
    content: 'Los equipos se enfrentan en duelos. El equipo con mayor puntaje avanza, el otro queda eliminado. Así hasta la Gran Final.',
    highlight: 'Equipo eliminado = equipo fuera del torneo',
  },
  {
    icon: '👥',
    title: 'Tu equipo cuenta',
    subtitle: 'El puntaje es colectivo',
    content: 'Cada integrante del equipo juega individualmente, pero sus puntos se SUMAN al total del equipo. Todos aportan al resultado.',
    highlight: 'Tu puntaje + el de tus compañeros = puntaje del equipo',
  },
  {
    icon: '🎮',
    title: 'Partidas por ronda',
    subtitle: 'Cada participante tiene un número limitado de partidas',
    content: 'En cada ronda puedes jugar un máximo de partidas definido por el organizador. Aprovecha cada una al máximo.',
    highlight: 'Cuando se te acaban las partidas, solo queda esperar el resultado',
  },
  {
    icon: '❓',
    title: 'Las preguntas',
    subtitle: 'Trivia de múltiples categorías',
    content: 'Las preguntas son aleatorias: Geografía, Historia, Deportes, Ciencia, Cultura, Música, Tecnología, Lógica y más. Todas en español.',
    highlight: 'Las preguntas NO se repiten en el mismo torneo',
  },
  {
    icon: '⏱️',
    title: 'Tiempo límite',
    subtitle: 'El reloj corre desde que aparece la pregunta',
    content: 'Tienes un tiempo definido para responder cada pregunta. Si se agota el tiempo, pierdes la pregunta sin puntos.',
    highlight: 'Entre más rápido respondas, más puntos ganas',
  },
  {
    icon: '⭐',
    title: '¿Cómo se calcula el puntaje?',
    subtitle: 'Sistema de puntuación justo — estilo Kahoot',
    content: 'Todos juegan con las mismas condiciones (dificultad, preguntas, tiempo). La diferencia la hace la velocidad y la consistencia.',
    highlight: null,
  },
  {
    icon: '📊',
    title: 'Desglose de puntos',
    subtitle: 'Por cada pregunta correcta',
    content: '',
    highlight: null,
    isScoring: true,
  },
  {
    icon: '🔥',
    title: 'Racha (Streak)',
    subtitle: 'Bonus por respuestas consecutivas correctas',
    content: 'Si aciertas varias seguidas sin fallar, tu racha crece y ganas puntos extra. Si fallas, la racha se reinicia a cero.',
    highlight: '+20 pts por cada respuesta correcta consecutiva (máximo +100)',
  },
  {
    icon: '🏆',
    title: 'El camino al podio',
    subtitle: 'Las rondas del torneo',
    content: 'El torneo avanza ronda por ronda. Al terminar cada ronda se muestran los eliminados y clasificados. El organizador habilitará la siguiente ronda.',
    highlight: '🥇 Campeón · 🥈 Subcampeón · 🥉 Tercer lugar',
  },
  {
    icon: '🌳',
    title: 'El Bracket',
    subtitle: 'Así se organiza la competencia',
    content: 'Los equipos se ubican aleatoriamente en un árbol de eliminación: mitad al lado izquierdo, mitad al derecho. Cada duelo enfrenta a dos equipos, el ganador avanza al siguiente nivel.',
    highlight: '16Avos → Cuartos → Semifinal → Final (+ 3er puesto)',
  },
  {
    icon: '📺',
    title: 'Pantalla central',
    subtitle: 'El bracket se actualiza en tiempo real',
    content: 'En la pantalla principal verán el árbol completo del torneo. Los puntajes se actualizan en vivo con cada respuesta. Podrán ver cómo avanza su equipo y los rivales al mismo tiempo.',
    highlight: 'El bracket muestra: icono del equipo + nombre + puntaje acumulado',
  },
  {
    icon: '📱',
    title: 'Consejos finales',
    subtitle: 'Para que te vaya bien',
    content: '',
    highlight: null,
    isTips: true,
  },
  {
    icon: '🚀',
    title: '¿Listos?',
    subtitle: 'Que empiece el Brain Clash',
    content: 'Busca tu nombre, identifica tu equipo, y demuestra quién tiene el cerebro más rápido.',
    highlight: '¡Buena suerte a todos!',
  },
];

export default function TournamentPresentationPage() {
  const navigate = useNavigate();
  const [currentSlide, setCurrentSlide] = useState(0);

  const slide = SLIDES[currentSlide];
  const isLast = currentSlide === SLIDES.length - 1;
  const isFirst = currentSlide === 0;

  const next = () => { if (!isLast) setCurrentSlide(currentSlide + 1); };
  const prev = () => { if (!isFirst) setCurrentSlide(currentSlide - 1); };

  return (
    <div className="pres">
      {/* Progress bar */}
      <div className="pres__progress">
        <div className="pres__progress-bar" style={{ width: `${((currentSlide + 1) / SLIDES.length) * 100}%` }} />
      </div>

      {/* Slide */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentSlide}
          className="pres__slide"
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -50 }}
          transition={{ duration: 0.3 }}
        >
          <span className="pres__icon">{slide.icon}</span>
          <h1 className="pres__title">{slide.title}</h1>
          <p className="pres__subtitle">{slide.subtitle}</p>

          {slide.content && <p className="pres__content">{slide.content}</p>}

          {slide.highlight && (
            <div className="pres__highlight">
              <span>{slide.highlight}</span>
            </div>
          )}

          {/* Scoring slide */}
          {'isScoring' in slide && slide.isScoring && (
            <div className="pres__scoring">
              <div className="pres__scoring-row">
                <span className="pres__scoring-label">Puntos base (por dificultad)</span>
                <span className="pres__scoring-value">100 - 300 pts</span>
              </div>
              <div className="pres__scoring-row pres__scoring-row--highlight">
                <span className="pres__scoring-label">⚡ Bonus velocidad (entre más rápido contestes)</span>
                <span className="pres__scoring-value">0 - 100 pts</span>
              </div>
              <div className="pres__scoring-row">
                <span className="pres__scoring-label">🔥 Bonus racha (respuestas seguidas correctas)</span>
                <span className="pres__scoring-value">0 - 100 pts</span>
              </div>
              <div className="pres__scoring-total">
                <span>Máximo por pregunta:</span>
                <span className="pres__scoring-total-value">500 pts</span>
              </div>
            </div>
          )}

          {/* Tips slide */}
          {'isTips' in slide && slide.isTips && (
            <div className="pres__tips">
              <div className="pres__tip">💡 Lee bien la pregunta antes de responder</div>
              <div className="pres__tip">⚡ La velocidad importa — no dudes si estás seguro</div>
              <div className="pres__tip">🔥 Mantén tu racha, cada correcta consecutiva suma más</div>
              <div className="pres__tip">🤝 Comunícate con tu equipo, todos aportan</div>
              <div className="pres__tip">🚫 No recargues la página a menos que sea necesario</div>
              <div className="pres__tip">📱 Si tienes problemas, selecciona tu nombre de nuevo</div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Navigation */}
      <div className="pres__nav">
        <button className="pres__nav-btn" onClick={prev} disabled={isFirst}>
          ← Anterior
        </button>
        <span className="pres__nav-counter">{currentSlide + 1} / {SLIDES.length}</span>
        {isLast ? (
          <button className="pres__nav-btn pres__nav-btn--start" onClick={() => navigate('/tournaments')}>
            🚀 Ir a Torneos
          </button>
        ) : (
          <button className="pres__nav-btn pres__nav-btn--next" onClick={next}>
            Siguiente →
          </button>
        )}
      </div>
    </div>
  );
}
