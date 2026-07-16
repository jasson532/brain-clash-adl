import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { getGamedays, createGameday } from 'modules/shared/services/supabase/gameday.service';
import { useAdmin } from 'modules/shared/context/AdminContext';
import AdminLoginModal from 'modules/shared/components/AdminLoginModal/AdminLoginModal';
import type { Gameday } from 'modules/shared/types/gameday.types';
import './GamedayListPage.css';

export default function GamedayListPage() {
  const navigate = useNavigate();
  const { isAdmin, adminName, logout } = useAdmin();
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [gamedays, setGamedays] = useState<Gameday[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newEventDate, setNewEventDate] = useState('');
  const [newMaxGames, setNewMaxGames] = useState(3);
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    loadGamedays();
  }, []);

  const loadGamedays = async () => {
    try {
      const data = await getGamedays();
      setGamedays(data as Gameday[]);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setIsCreating(true);
    try {
      await createGameday({
        name: newName.trim(),
        description: newDescription.trim() || null,
        event_date: newEventDate || null,
        max_games_per_participant: newMaxGames,
      });
      setShowCreate(false);
      setNewName('');
      setNewDescription('');
      setNewEventDate('');
      await loadGamedays();
    } catch (err) {
      console.error(err);
    } finally {
      setIsCreating(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return { label: '🟢 En vivo', className: 'gdlist__badge--active' };
      case 'finished':
        return { label: '🏁 Finalizado', className: 'gdlist__badge--finished' };
      default:
        return { label: '📅 Próximo', className: 'gdlist__badge--upcoming' };
    }
  };

  return (
    <div className="gdlist">
      <button className="gdlist__back" onClick={() => navigate('/')}>← Inicio</button>
      <div className="gdlist__header">
        <div>
          <h1 className="gdlist__title">🎮 GameDays</h1>
          <p className="gdlist__subtitle">Crea y administra tus eventos de trivia por equipos</p>
        </div>
        <div className="gdlist__header-actions">
          {isAdmin ? (
            <>
              <span className="gdlist__admin-badge">🔓 {adminName}</span>
              <motion.button
                className="gdlist__create-btn"
                onClick={() => setShowCreate(true)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                + Nuevo GameDay
              </motion.button>
              <button className="gdlist__logout-btn" onClick={logout}>Salir</button>
            </>
          ) : (
            <motion.button
              className="gdlist__admin-btn"
              onClick={() => setShowAdminLogin(true)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              🎯 Soy del Frente Participación
            </motion.button>
          )}
        </div>
      </div>

      <AdminLoginModal isOpen={showAdminLogin} onClose={() => setShowAdminLogin(false)} />

      {/* Create modal */}
      <AnimatePresence>
        {showCreate && (
          <motion.div
            className="gdlist__overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowCreate(false)}
          >
            <motion.div
              className="gdlist__modal"
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="gdlist__modal-title">Crear GameDay</h2>

              <div className="gdlist__field">
                <label>Nombre del evento</label>
                <input
                  type="text"
                  placeholder="Ej: GameDay Sprint 42"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  autoFocus
                />
              </div>

              <div className="gdlist__field">
                <label>Descripción (opcional)</label>
                <input
                  type="text"
                  placeholder="Ej: Trivia de tecnología para el equipo"
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                />
              </div>

              <div className="gdlist__field">
                <label>📅 Fecha del evento</label>
                <input
                  type="date"
                  value={newEventDate}
                  onChange={(e) => setNewEventDate(e.target.value)}
                />
              </div>

              <div className="gdlist__field">
                <label>🎮 Máximo de juegos por participante: <strong>{newMaxGames}</strong></label>
                <input
                  type="range"
                  min={1}
                  max={10}
                  step={1}
                  value={newMaxGames}
                  onChange={(e) => setNewMaxGames(Number(e.target.value))}
                />
                <div className="gdlist__range-labels"><span>1</span><span>10</span></div>
              </div>

              <div className="gdlist__modal-actions">
                <button className="gdlist__btn--secondary" onClick={() => setShowCreate(false)}>
                  Cancelar
                </button>
                <button
                  className="gdlist__btn--primary"
                  onClick={handleCreate}
                  disabled={!newName.trim() || isCreating}
                >
                  {isCreating ? '⏳ Creando...' : '🚀 Crear GameDay'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* List */}
      {isLoading ? (
        <div className="gdlist__loading">⏳ Cargando GameDays...</div>
      ) : gamedays.length === 0 ? (
        <div className="gdlist__empty">
          <span className="gdlist__empty-icon">🎯</span>
          <p>No hay GameDays creados aún</p>
          <p className="gdlist__empty-hint">Crea uno para empezar la competencia</p>
        </div>
      ) : (
        <div className="gdlist__grid">
          {gamedays.map((gd, index) => {
            const badge = getStatusBadge(gd.status);
            return (
              <motion.div
                key={gd.id}
                className="gdlist__card"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                whileHover={{ scale: 1.02, y: -4 }}
                onClick={() => navigate(`/gameday/${gd.id}`)}
              >
                <div className="gdlist__card-header">
                  <h3 className="gdlist__card-name">{gd.name}</h3>
                  <span className={`gdlist__badge ${badge.className}`}>{badge.label}</span>
                </div>
                {gd.description && (
                  <p className="gdlist__card-desc">{gd.description}</p>
                )}
                <div className="gdlist__card-meta">
                  {(gd as Gameday & { event_date?: string }).event_date && (
                    <span>📅 {new Date((gd as Gameday & { event_date?: string }).event_date + 'T00:00:00').toLocaleDateString()}</span>
                  )}
                  <span>📅 Creado: {new Date(gd.created_at).toLocaleDateString()}</span>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
