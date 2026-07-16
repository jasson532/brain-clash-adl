import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { GameConfig } from 'modules/shared/types/game.types';
import { TRIVIA_CATEGORIES, AVATARS } from 'modules/shared/types/game.types';
import './LobbyPage.css';

interface LobbyPageProps {
  config: GameConfig;
  selectedAvatar: string;
  onSelectAvatar: (avatar: string) => void;
  onUpdateConfig: (updates: Partial<GameConfig>) => void;
  onStart: () => void;
  onBack: () => void;
  isLoading: boolean;
  error: string | null;
}

export default function LobbyPage({
  config,
  selectedAvatar,
  onSelectAvatar,
  onUpdateConfig,
  onStart,
  onBack,
  isLoading,
  error,
}: LobbyPageProps) {
  const [step, setStep] = useState<'name' | 'config'>('name');

  const handleNameSubmit = () => {
    if (config.playerName.trim()) {
      setStep('config');
    }
  };

  return (
    <div className="lobby">
      <motion.button
        className="lobby__back"
        onClick={onBack}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        ← Volver
      </motion.button>

      <AnimatePresence mode="wait">
        {step === 'name' ? (
          <motion.div
            key="name"
            className="lobby__card"
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 50 }}
          >
            <h2 className="lobby__card-title">¿Quién eres, guerrero?</h2>
            <p className="lobby__card-subtitle">Elige tu avatar y nombre de batalla</p>

            <div className="lobby__avatars">
              {AVATARS.map((avatar) => (
                <motion.button
                  key={avatar}
                  className={`lobby__avatar ${selectedAvatar === avatar ? 'lobby__avatar--selected' : ''}`}
                  onClick={() => onSelectAvatar(avatar)}
                  whileHover={{ scale: 1.2 }}
                  whileTap={{ scale: 0.9 }}
                >
                  {avatar}
                </motion.button>
              ))}
            </div>

            <input
              className="lobby__input"
              type="text"
              placeholder="Tu nombre de batalla..."
              value={config.playerName}
              onChange={(e) => onUpdateConfig({ playerName: e.target.value })}
              onKeyDown={(e) => e.key === 'Enter' && handleNameSubmit()}
              maxLength={20}
              autoFocus
            />

            <motion.button
              className="lobby__btn lobby__btn--primary"
              onClick={handleNameSubmit}
              disabled={!config.playerName.trim()}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
            >
              Continuar →
            </motion.button>
          </motion.div>
        ) : (
          <motion.div
            key="config"
            className="lobby__card"
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 50 }}
          >
            <div className="lobby__player-preview">
              <span className="lobby__player-avatar">{selectedAvatar}</span>
              <span className="lobby__player-name">{config.playerName}</span>
            </div>

            <h2 className="lobby__card-title">Configura tu desafío</h2>

            {/* Category */}
            <div className="lobby__field">
              <label className="lobby__label">Categoría</label>
              <select
                className="lobby__select"
                value={config.category ?? ''}
                onChange={(e) =>
                  onUpdateConfig({ category: e.target.value ? Number(e.target.value) : null })
                }
              >
                <option value="">🎲 Todas las categorías</option>
                {TRIVIA_CATEGORIES.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Difficulty */}
            <div className="lobby__field">
              <label className="lobby__label">Dificultad</label>
              <div className="lobby__difficulty-options">
                {[
                  { value: null, label: '🎲 Mixta', color: 'var(--primary)' },
                  { value: 'easy' as const, label: '🟢 Fácil', color: 'var(--success)' },
                  { value: 'medium' as const, label: '🟡 Medio', color: 'var(--warning)' },
                  { value: 'hard' as const, label: '🔴 Difícil', color: 'var(--danger)' },
                ].map((opt) => (
                  <motion.button
                    key={opt.label}
                    className={`lobby__diff-btn ${config.difficulty === opt.value ? 'lobby__diff-btn--active' : ''}`}
                    style={
                      config.difficulty === opt.value
                        ? { borderColor: opt.color, boxShadow: `0 0 15px ${opt.color}40` }
                        : {}
                    }
                    onClick={() => onUpdateConfig({ difficulty: opt.value })}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    {opt.label}
                  </motion.button>
                ))}
              </div>
            </div>

            {/* Number of questions */}
            <div className="lobby__field">
              <label className="lobby__label">
                Preguntas: <strong>{config.numberOfQuestions}</strong>
              </label>
              <input
                className="lobby__range"
                type="range"
                min={5}
                max={30}
                step={5}
                value={config.numberOfQuestions}
                onChange={(e) => onUpdateConfig({ numberOfQuestions: Number(e.target.value) })}
              />
              <div className="lobby__range-labels">
                <span>5</span>
                <span>30</span>
              </div>
            </div>

            {/* Time per question */}
            <div className="lobby__field">
              <label className="lobby__label">
                Tiempo por pregunta: <strong>{config.timePerQuestion}s</strong>
              </label>
              <input
                className="lobby__range"
                type="range"
                min={10}
                max={45}
                step={5}
                value={config.timePerQuestion}
                onChange={(e) => onUpdateConfig({ timePerQuestion: Number(e.target.value) })}
              />
              <div className="lobby__range-labels">
                <span>10s</span>
                <span>45s</span>
              </div>
            </div>

            {error && (
              <motion.div
                className="lobby__error"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                ⚠️ {error}
              </motion.div>
            )}

            <div className="lobby__actions">
              <motion.button
                className="lobby__btn lobby__btn--secondary"
                onClick={() => setStep('name')}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
              >
                ← Atrás
              </motion.button>
              <motion.button
                className="lobby__btn lobby__btn--primary"
                onClick={onStart}
                disabled={isLoading}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
              >
                {isLoading ? (
                  <span className="lobby__loading">⏳ Cargando...</span>
                ) : (
                  '🚀 ¡A jugar!'
                )}
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
