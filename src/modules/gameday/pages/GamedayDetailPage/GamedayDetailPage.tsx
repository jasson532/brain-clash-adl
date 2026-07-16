import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  getGameday,
  getTeamsByGameday,
  getParticipantsByTeam,
  createTeam,
  addParticipant,
  updateGamedayStatus,
  updateGameday,
  updateTeam,
  updateParticipant,
  deleteTeam,
  deleteParticipant,
  deleteGameday,
  getTeamLeaderboard,
  subscribeToScores,
} from 'modules/shared/services/supabase/gameday.service';
import { useAdmin } from 'modules/shared/context/AdminContext';
import type { Gameday, Team, Participant, TeamLeaderboardEntry } from 'modules/shared/types/gameday.types';
import { TEAM_COLORS, TEAM_AVATARS } from 'modules/shared/types/gameday.types';
import { AVATARS } from 'modules/shared/types/game.types';
import './GamedayDetailPage.css';

interface TeamWithParticipants extends Team {
  participants: Participant[];
}

type ModalType = 'create-team' | 'edit-team' | 'add-participant' | 'edit-participant' | 'edit-gameday' | null;

export default function GamedayDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isAdmin } = useAdmin();
  const [gameday, setGameday] = useState<Gameday | null>(null);
  const [teams, setTeams] = useState<TeamWithParticipants[]>([]);
  const [leaderboard, setLeaderboard] = useState<TeamLeaderboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modal state
  const [modal, setModal] = useState<ModalType>(null);

  // Create/Edit team
  const [teamName, setTeamName] = useState('');
  const [teamColor, setTeamColor] = useState(TEAM_COLORS[0]);
  const [teamAvatar, setTeamAvatar] = useState(TEAM_AVATARS[0]);
  const [editingTeamId, setEditingTeamId] = useState<string | null>(null);

  // Add/Edit participant
  const [participantName, setParticipantName] = useState('');
  const [participantAvatar, setParticipantAvatar] = useState(AVATARS[0]);
  const [targetTeamId, setTargetTeamId] = useState<string | null>(null);
  const [editingParticipantId, setEditingParticipantId] = useState<string | null>(null);

  // Edit gameday
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editEventDate, setEditEventDate] = useState('');
  const [editMaxGames, setEditMaxGames] = useState(3);

  const loadData = useCallback(async () => {
    if (!id) return;
    try {
      const [gd, teamsList, lb] = await Promise.all([
        getGameday(id),
        getTeamsByGameday(id),
        getTeamLeaderboard(id),
      ]);
      setGameday(gd as Gameday);
      setLeaderboard(lb);

      const teamsWithParticipants = await Promise.all(
        (teamsList as Team[]).map(async (team) => {
          const participants = await getParticipantsByTeam(team.id);
          return { ...team, participants: participants as Participant[] };
        }),
      );
      setTeams(teamsWithParticipants);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    if (!id) return;
    const unsubscribe = subscribeToScores(id, () => {
      getTeamLeaderboard(id).then(setLeaderboard);
    });
    return unsubscribe;
  }, [id]);

  // ============ HANDLERS ============

  const handleCreateTeam = async () => {
    if (!teamName.trim() || !id) return;
    await createTeam({ gameday_id: id, name: teamName.trim(), color: teamColor, avatar: teamAvatar });
    closeModal();
    await loadData();
  };

  const handleEditTeam = async () => {
    if (!teamName.trim() || !editingTeamId) return;
    await updateTeam(editingTeamId, { name: teamName.trim(), color: teamColor, avatar: teamAvatar });
    closeModal();
    await loadData();
  };

  const handleDeleteTeam = async (teamId: string) => {
    if (!confirm('¿Eliminar este equipo y todos sus participantes?')) return;
    await deleteTeam(teamId);
    await loadData();
  };

  const handleAddParticipant = async () => {
    if (!participantName.trim() || !targetTeamId) return;
    await addParticipant({ team_id: targetTeamId, name: participantName.trim(), avatar: participantAvatar });
    closeModal();
    await loadData();
  };

  const handleEditParticipant = async () => {
    if (!participantName.trim() || !editingParticipantId) return;
    await updateParticipant(editingParticipantId, { name: participantName.trim(), avatar: participantAvatar });
    closeModal();
    await loadData();
  };

  const handleDeleteParticipant = async (participantId: string) => {
    if (!confirm('¿Eliminar este participante?')) return;
    await deleteParticipant(participantId);
    await loadData();
  };

  const handleEditGameday = async () => {
    if (!editName.trim() || !id) return;
    await updateGameday(id, {
      name: editName.trim(),
      description: editDescription.trim() || null,
      event_date: editEventDate || null,
      max_games_per_participant: editMaxGames,
    });
    closeModal();
    await loadData();
  };

  const handleDeleteGameday = async () => {
    if (!confirm('¿Eliminar este GameDay y todos sus datos?')) return;
    if (!id) return;
    await deleteGameday(id);
    navigate('/gamedays');
  };

  const handleStatusChange = async (status: 'upcoming' | 'active' | 'finished') => {
    if (!id) return;
    await updateGamedayStatus(id, status);
    await loadData();
  };

  // ============ MODAL HELPERS ============

  const closeModal = () => {
    setModal(null);
    setTeamName('');
    setTeamColor(TEAM_COLORS[0]);
    setTeamAvatar(TEAM_AVATARS[0]);
    setParticipantName('');
    setParticipantAvatar(AVATARS[0]);
    setEditingTeamId(null);
    setEditingParticipantId(null);
    setTargetTeamId(null);
  };

  const openEditTeam = (team: TeamWithParticipants) => {
    setEditingTeamId(team.id);
    setTeamName(team.name);
    setTeamColor(team.color);
    setTeamAvatar(team.avatar);
    setModal('edit-team');
  };

  const openAddParticipant = (teamId: string) => {
    setTargetTeamId(teamId);
    setParticipantName('');
    setParticipantAvatar(AVATARS[0]);
    setModal('add-participant');
  };

  const openEditParticipant = (p: Participant) => {
    setEditingParticipantId(p.id);
    setParticipantName(p.name);
    setParticipantAvatar(p.avatar);
    setModal('edit-participant');
  };

  const openEditGameday = () => {
    if (!gameday) return;
    setEditName(gameday.name);
    setEditDescription(gameday.description ?? '');
    setEditEventDate(gameday.event_date ?? '');
    setEditMaxGames(gameday.max_games_per_participant);
    setModal('edit-gameday');
  };

  // ============ RENDER ============

  if (isLoading) return <div className="gddetail__loading">⏳ Cargando GameDay...</div>;
  if (!gameday) return <div className="gddetail__loading">❌ GameDay no encontrado</div>;

  return (
    <div className="gddetail">
      {/* Header */}
      <div className="gddetail__header">
        <button className="gddetail__back" onClick={() => navigate('/gamedays')}>← GameDays</button>
        <div className="gddetail__header-info">
          <h1 className="gddetail__title">{gameday.name}</h1>
          {gameday.description && <p className="gddetail__desc">{gameday.description}</p>}
          {gameday.event_date && (
            <p className="gddetail__date">📅 {new Date(gameday.event_date + 'T00:00:00').toLocaleDateString('es-CO', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
          )}
        </div>
        <div className="gddetail__header-actions">
          {isAdmin && (
            <motion.button
              className="gddetail__action-btn gddetail__action-btn--edit"
              onClick={openEditGameday}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              ✏️ Editar
            </motion.button>
          )}
          {isAdmin && gameday.status === 'upcoming' && (
            <motion.button
              className="gddetail__action-btn gddetail__action-btn--start"
              onClick={() => handleStatusChange('active')}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              🚀 Iniciar
            </motion.button>
          )}
          {gameday.status === 'active' && (
            <>
              <motion.button
                className="gddetail__action-btn gddetail__action-btn--play"
                onClick={() => navigate(`/gameday/${id}/play`)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                🎮 Jugar
              </motion.button>
              {isAdmin && (
                <motion.button
                  className="gddetail__action-btn gddetail__action-btn--finish"
                  onClick={() => handleStatusChange('finished')}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  🏁 Finalizar
                </motion.button>
              )}
            </>
          )}
          <motion.button
            className="gddetail__action-btn gddetail__action-btn--dashboard"
            onClick={() => navigate(`/gameday/${id}/dashboard`)}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            📊 Dashboard
          </motion.button>
          {isAdmin && (
            <motion.button
              className="gddetail__action-btn gddetail__action-btn--delete"
              onClick={handleDeleteGameday}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              🗑️
            </motion.button>
          )}
        </div>
      </div>

      <div className="gddetail__content">
        {/* Teams */}
        <div className="gddetail__section">
          <div className="gddetail__section-header">
            <h2>⚔️ Equipos ({teams.length})</h2>
            {gameday.status === 'active' && (
              <motion.button
                className="gddetail__add-team-btn"
                onClick={() => setModal('create-team')}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                + Crear Equipo
              </motion.button>
            )}
          </div>

          <div className="gddetail__teams-grid">
            {teams.map((team) => {
              const teamScore = leaderboard.find((l) => l.team_id === team.id);
              return (
                <motion.div
                  key={team.id}
                  className="gddetail__team-card"
                  style={{ borderColor: team.color }}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <div className="gddetail__team-header">
                    <span className="gddetail__team-avatar">{team.avatar}</span>
                    <div style={{ flex: 1 }}>
                      <h3 className="gddetail__team-name" style={{ color: team.color }}>{team.name}</h3>
                      <span className="gddetail__team-score">⭐ {teamScore?.total_score ?? 0} pts</span>
                    </div>
                    <div className="gddetail__team-actions">
                      {isAdmin && <button onClick={() => openEditTeam(team)} title="Editar">✏️</button>}
                      {isAdmin && <button onClick={() => handleDeleteTeam(team.id)} title="Eliminar">🗑️</button>}
                    </div>
                  </div>

                  <div className="gddetail__participants">
                    {team.participants.map((p) => (
                      <div key={p.id} className="gddetail__participant">
                        <span>{p.avatar}</span>
                        <span style={{ flex: 1 }}>{p.name}</span>
                        {isAdmin && <button className="gddetail__participant-edit" onClick={() => openEditParticipant(p)}>✏️</button>}
                        {isAdmin && <button className="gddetail__participant-edit" onClick={() => handleDeleteParticipant(p.id)}>✕</button>}
                      </div>
                    ))}
                    <button className="gddetail__add-participant" onClick={() => openAddParticipant(team.id)}>
                      + Agregar participante
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Mini leaderboard */}
        {leaderboard.length > 0 && (
          <div className="gddetail__section">
            <h2>🏆 Ranking</h2>
            <div className="gddetail__mini-leaderboard">
              {leaderboard.map((entry, index) => (
                <div key={entry.team_id} className="gddetail__lb-row">
                  <span className="gddetail__lb-pos">
                    {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`}
                  </span>
                  <span className="gddetail__lb-avatar">{entry.team_avatar}</span>
                  <span className="gddetail__lb-name" style={{ color: entry.team_color }}>{entry.team_name}</span>
                  <span className="gddetail__lb-score">⭐ {entry.total_score}</span>
                  <span className="gddetail__lb-games">{entry.games_played} juegos</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ============ MODALS ============ */}
      <AnimatePresence>
        {modal && (
          <motion.div
            className="gddetail__overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeModal}
          >
            <motion.div
              className="gddetail__modal"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Create/Edit Team */}
              {(modal === 'create-team' || modal === 'edit-team') && (
                <>
                  <h3>{modal === 'create-team' ? 'Crear Equipo' : 'Editar Equipo'}</h3>
                  <input
                    type="text"
                    placeholder="Nombre del equipo"
                    value={teamName}
                    onChange={(e) => setTeamName(e.target.value)}
                    autoFocus
                  />
                  <div className="gddetail__color-picker">
                    {TEAM_COLORS.map((color) => (
                      <button
                        key={color}
                        className={`gddetail__color-btn ${teamColor === color ? 'gddetail__color-btn--active' : ''}`}
                        style={{ background: color }}
                        onClick={() => setTeamColor(color)}
                      />
                    ))}
                  </div>
                  <div className="gddetail__avatar-picker">
                    {TEAM_AVATARS.map((av) => (
                      <button
                        key={av}
                        className={`gddetail__avatar-btn ${teamAvatar === av ? 'gddetail__avatar-btn--active' : ''}`}
                        onClick={() => setTeamAvatar(av)}
                      >
                        {av}
                      </button>
                    ))}
                  </div>
                  <div className="gddetail__modal-actions">
                    <button onClick={closeModal}>Cancelar</button>
                    <button
                      className="gddetail__btn-primary"
                      onClick={modal === 'create-team' ? handleCreateTeam : handleEditTeam}
                      disabled={!teamName.trim()}
                    >
                      {modal === 'create-team' ? 'Crear' : 'Guardar'}
                    </button>
                  </div>
                </>
              )}

              {/* Add/Edit Participant */}
              {(modal === 'add-participant' || modal === 'edit-participant') && (
                <>
                  <h3>{modal === 'add-participant' ? 'Agregar Participante' : 'Editar Participante'}</h3>
                  <input
                    type="text"
                    placeholder="Nombre del participante"
                    value={participantName}
                    onChange={(e) => setParticipantName(e.target.value)}
                    autoFocus
                  />
                  <div className="gddetail__avatar-picker">
                    {AVATARS.map((av) => (
                      <button
                        key={av}
                        className={`gddetail__avatar-btn ${participantAvatar === av ? 'gddetail__avatar-btn--active' : ''}`}
                        onClick={() => setParticipantAvatar(av)}
                      >
                        {av}
                      </button>
                    ))}
                  </div>
                  <div className="gddetail__modal-actions">
                    <button onClick={closeModal}>Cancelar</button>
                    <button
                      className="gddetail__btn-primary"
                      onClick={modal === 'add-participant' ? handleAddParticipant : handleEditParticipant}
                      disabled={!participantName.trim()}
                    >
                      {modal === 'add-participant' ? 'Agregar' : 'Guardar'}
                    </button>
                  </div>
                </>
              )}

              {/* Edit GameDay */}
              {modal === 'edit-gameday' && (
                <>
                  <h3>Editar GameDay</h3>
                  <div className="gddetail__form-field">
                    <label>Nombre</label>
                    <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} />
                  </div>
                  <div className="gddetail__form-field">
                    <label>Descripción</label>
                    <input type="text" value={editDescription} onChange={(e) => setEditDescription(e.target.value)} placeholder="Opcional" />
                  </div>
                  <div className="gddetail__form-field">
                    <label>📅 Fecha del evento</label>
                    <input type="date" value={editEventDate} onChange={(e) => setEditEventDate(e.target.value)} />
                  </div>
                  <div className="gddetail__form-field">
                    <label>🎮 Máx. juegos por participante: <strong>{editMaxGames}</strong></label>
                    <input type="range" min={1} max={10} step={1} value={editMaxGames} onChange={(e) => setEditMaxGames(Number(e.target.value))} />
                  </div>
                  <div className="gddetail__modal-actions">
                    <button onClick={closeModal}>Cancelar</button>
                    <button className="gddetail__btn-primary" onClick={handleEditGameday} disabled={!editName.trim()}>
                      Guardar
                    </button>
                  </div>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
