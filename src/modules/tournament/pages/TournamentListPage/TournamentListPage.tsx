import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { getTournaments, createTournament, deleteTournament } from 'modules/shared/services/supabase/tournament.service';
import { useAdmin } from 'modules/shared/context/AdminContext';
import AdminLoginModal from 'modules/shared/components/AdminLoginModal/AdminLoginModal';
import type { Tournament, TournamentSize } from 'modules/shared/types/tournament.types';
import './TournamentListPage.css';

export default function TournamentListPage() {
  const navigate = useNavigate();
  const { isAdmin, adminName, logout } = useAdmin();
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newDate, setNewDate] = useState('');
  const [newSize, setNewSize] = useState<TournamentSize>(16);
  const [newMaxGames, setNewMaxGames] = useState(3);
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => { loadTournaments(); }, []);

  const loadTournaments = async () => {
    try {
      const data = await getTournaments();
      setTournaments(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!newName.trim() || !newDate) return;
    setIsCreating(true);
    try {
      await createTournament({
        name: newName.trim(),
        description: newDescription.trim() || null,
        date: newDate,
        size: newSize,
        max_games_per_participant: newMaxGames,
      });
      setShowCreate(false);
      setNewName('');
      setNewDescription('');
      setNewDate('');
      setNewSize(16);
      setNewMaxGames(3);
      await loadTournaments();
    } catch (err) {
      console.error(err);
    } finally {
      setIsCreating(false);
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('¿Eliminar este torneo y todos sus datos?')) return;
    await deleteTournament(id);
    await loadTournaments();
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'in_progress': return { label: '🟢 En curso', className: 'trnlist__badge--active' };
      case 'organizing': return { label: '🔧 Organizando', className: 'trnlist__badge--organizing' };
      case 'paused': return { label: '⏸️ Pausado', className: 'trnlist__badge--paused' };
      case 'finished': return { label: '🏆 Finalizado', className: 'trnlist__badge--finished' };
      default: return { label: '📋 Pendiente', className: 'trnlist__badge--pending' };
    }
  };

  return (
    <div className="trnlist">
      <button className="trnlist__back" onClick={() => navigate('/')}>← Inicio</button>

      {/* Brand header */}
      <div className="trnlist__brand">
        <span className="trnlist__brand-icon">🧠</span>
        <div className="trnlist__brand-text">
          <span className="trnlist__brand-brain">BRAIN</span>
          <span className="trnlist__brand-clash">CLASH</span>
        </div>
        <span className="trnlist__brand-adl">ADL</span>
      </div>

      <div className="trnlist__header">
        <div>
          <h1 className="trnlist__title">🏆 Torneos</h1>
          <p className="trnlist__subtitle">Eliminación directa. Solo los mejores sobreviven.</p>
        </div>
        <div className="trnlist__header-actions">
          {isAdmin ? (
            <>
              <span className="trnlist__admin-badge">🔓 {adminName}</span>
              <motion.button
                className="trnlist__create-btn"
                onClick={() => setShowCreate(true)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                + Nuevo Torneo
              </motion.button>
              <button className="trnlist__logout-btn" onClick={logout}>Salir</button>
            </>
          ) : (
            <motion.button
              className="trnlist__admin-btn"
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
            className="trnlist__overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowCreate(false)}
          >
            <motion.div
              className="trnlist__modal"
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="trnlist__modal-title">🏆 Crear Torneo</h2>

              <div className="trnlist__field">
                <label>Nombre del torneo</label>
                <input
                  type="text"
                  placeholder="Ej: Copa ADL 2026"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  autoFocus
                />
              </div>

              <div className="trnlist__field">
                <label>Descripción (opcional)</label>
                <input
                  type="text"
                  placeholder="Ej: Torneo eliminación de trivia"
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                />
              </div>

              <div className="trnlist__field">
                <label>📅 Fecha del torneo</label>
                <input
                  type="date"
                  value={newDate}
                  onChange={(e) => setNewDate(e.target.value)}
                />
              </div>

              <div className="trnlist__field">
                <label>⚔️ Cantidad de equipos</label>
                <div className="trnlist__size-options">
                  {([8, 16, 32] as TournamentSize[]).map((size) => (
                    <button
                      key={size}
                      className={`trnlist__size-btn ${newSize === size ? 'trnlist__size-btn--active' : ''}`}
                      onClick={() => setNewSize(size)}
                    >
                      {size} equipos
                    </button>
                  ))}
                </div>
              </div>

              <div className="trnlist__field">
                <label>🎮 Máximo de juegos por participante por ronda: <strong>{newMaxGames}</strong></label>
                <input
                  type="range"
                  min={1}
                  max={10}
                  step={1}
                  value={newMaxGames}
                  onChange={(e) => setNewMaxGames(Number(e.target.value))}
                />
                <div className="trnlist__range-labels"><span>1</span><span>10</span></div>
              </div>

              <div className="trnlist__modal-actions">
                <button className="trnlist__btn--secondary" onClick={() => setShowCreate(false)}>
                  Cancelar
                </button>
                <button
                  className="trnlist__btn--primary"
                  onClick={handleCreate}
                  disabled={!newName.trim() || !newDate || isCreating}
                >
                  {isCreating ? '⏳ Creando...' : '🏆 Crear Torneo'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* List */}
      {isLoading ? (
        <div className="trnlist__loading">⏳ Cargando torneos...</div>
      ) : tournaments.length === 0 ? (
        <div className="trnlist__empty">
          <span className="trnlist__empty-icon">🏆</span>
          <p>No hay torneos creados aún</p>
          <p className="trnlist__empty-hint">Crea un torneo para iniciar la competencia de eliminación</p>
        </div>
      ) : (
        <div className="trnlist__grid">
          {tournaments.map((trn, index) => {
            const badge = getStatusBadge(trn.status);
            return (
              <motion.div
                key={trn.id}
                className="trnlist__card"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                whileHover={{ scale: 1.02, y: -4 }}
                onClick={() => navigate(`/tournament/${trn.id}`)}
              >
                <div className="trnlist__card-header">
                  <h3 className="trnlist__card-name">{trn.name}</h3>
                  <span className={`trnlist__badge ${badge.className}`}>{badge.label}</span>
                </div>
                {trn.description && <p className="trnlist__card-desc">{trn.description}</p>}
                <div className="trnlist__card-meta">
                  <span>⚔️ {trn.size} equipos</span>
                  <span>📅 {new Date(trn.date + 'T00:00:00').toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                </div>
                {isAdmin && (
                  <button
                    className="trnlist__card-delete"
                    onClick={(e) => handleDelete(trn.id, e)}
                    title="Eliminar torneo"
                  >
                    🗑️
                  </button>
                )}
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
