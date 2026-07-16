import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  getTournament,
  getTrnTeamsByTournament,
  getTrnParticipantsByTeam,
  createTrnTeam,
  updateTrnTeam,
  deleteTrnTeam,
  addTrnParticipant,
  updateTrnParticipant,
  deleteTrnParticipant,
  updateTournament,
  deleteTournament,
  organizeTournament,
  getRoundsByTournament,
  startRound,
} from 'modules/shared/services/supabase/tournament.service';
import { useAdmin } from 'modules/shared/context/AdminContext';
import { useConfirm } from 'modules/shared/hooks/useConfirm';
import ConfirmModal from 'modules/shared/components/ConfirmModal/ConfirmModal';
import type { Tournament, TrnTeamWithParticipants, TrnParticipant, TrnRound } from 'modules/shared/types/tournament.types';
import { TRN_TEAM_COLORS, TRN_TEAM_AVATARS } from 'modules/shared/types/tournament.types';
import { AVATARS } from 'modules/shared/types/game.types';
import './TournamentDetailPage.css';

type ModalType = 'create-team' | 'edit-team' | 'add-participant' | 'edit-participant' | 'edit-tournament' | null;

export default function TournamentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isAdmin } = useAdmin();
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [teams, setTeams] = useState<TrnTeamWithParticipants[]>([]);
  const [rounds, setRounds] = useState<TrnRound[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isOrganizing, setIsOrganizing] = useState(false);
  const confirmModal = useConfirm();

  // Modal state
  const [modal, setModal] = useState<ModalType>(null);
  const [teamName, setTeamName] = useState('');
  const [teamColor, setTeamColor] = useState(TRN_TEAM_COLORS[0]);
  const [teamAvatar, setTeamAvatar] = useState(TRN_TEAM_AVATARS[0]);
  const [editingTeamId, setEditingTeamId] = useState<string | null>(null);
  const [participantName, setParticipantName] = useState('');
  const [participantAvatar, setParticipantAvatar] = useState(AVATARS[0]);
  const [targetTeamId, setTargetTeamId] = useState<string | null>(null);
  const [editingParticipantId, setEditingParticipantId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editDate, setEditDate] = useState('');

  const loadData = useCallback(async () => {
    if (!id) return;
    try {
      const [trn, teamsList, roundsList] = await Promise.all([
        getTournament(id),
        getTrnTeamsByTournament(id),
        getRoundsByTournament(id),
      ]);
      setTournament(trn);
      setRounds(roundsList);

      const teamsWithParticipants = await Promise.all(
        teamsList.map(async (team) => {
          const participants = await getTrnParticipantsByTeam(team.id);
          return { ...team, participants };
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

  // ============ HANDLERS ============

  const handleCreateTeam = async () => {
    if (!teamName.trim() || !id) return;
    await createTrnTeam({ tournament_id: id, name: teamName.trim(), color: teamColor, avatar: teamAvatar });
    closeModal();
    await loadData();
  };

  const handleEditTeam = async () => {
    if (!teamName.trim() || !editingTeamId) return;
    await updateTrnTeam(editingTeamId, { name: teamName.trim(), color: teamColor, avatar: teamAvatar });
    closeModal();
    await loadData();
  };

  const handleDeleteTeam = async (teamId: string) => {
    const ok = await confirmModal.confirm({
      title: '🗑️ Eliminar equipo',
      message: '¿Eliminar este equipo y todos sus participantes?',
      confirmText: 'Eliminar',
      variant: 'danger',
    });
    if (!ok) return;
    await deleteTrnTeam(teamId);
    await loadData();
  };

  const handleAddParticipant = async () => {
    if (!participantName.trim() || !targetTeamId) return;
    await addTrnParticipant({ team_id: targetTeamId, name: participantName.trim(), avatar: participantAvatar });
    closeModal();
    await loadData();
  };

  const handleEditParticipant = async () => {
    if (!participantName.trim() || !editingParticipantId) return;
    await updateTrnParticipant(editingParticipantId, { name: participantName.trim(), avatar: participantAvatar });
    closeModal();
    await loadData();
  };

  const handleDeleteParticipant = async (participantId: string) => {
    const ok = await confirmModal.confirm({
      title: '👤 Eliminar participante',
      message: '¿Eliminar este participante del equipo?',
      confirmText: 'Eliminar',
      variant: 'danger',
    });
    if (!ok) return;
    await deleteTrnParticipant(participantId);
    await loadData();
  };

  const handleEditTournament = async () => {
    if (!editName.trim() || !id) return;
    await updateTournament(id, {
      name: editName.trim(),
      description: editDescription.trim() || null,
      date: editDate,
    });
    closeModal();
    await loadData();
  };

  const handleDeleteTournament = async () => {
    const ok = await confirmModal.confirm({
      title: '🗑️ Eliminar torneo',
      message: '¿Eliminar este torneo y todos sus datos? Esta acción no se puede deshacer.',
      confirmText: 'Eliminar torneo',
      variant: 'danger',
    });
    if (!ok) return;
    if (!id) return;
    await deleteTournament(id);
    navigate('/tournaments');
  };

  const handleOrganize = async () => {
    if (!id || !tournament) return;
    if (teams.length !== tournament.size) {
      await confirmModal.confirm({
        title: '⚠️ Equipos insuficientes',
        message: `Se necesitan exactamente ${tournament.size} equipos para organizar el torneo. Hay ${teams.length} registrados.`,
        confirmText: 'Entendido',
        cancelText: '',
        variant: 'default',
      });
      return;
    }
    const ok = await confirmModal.confirm({
      title: '🎲 Organizar bracket',
      message: `Los ${tournament.size} equipos se ordenarán aleatoriamente en el bracket de eliminación.`,
      confirmText: '¡Organizar!',
      variant: 'success',
    });
    if (!ok) return;
    setIsOrganizing(true);
    try {
      await organizeTournament(id);
      navigate(`/tournament/${id}/bracket`);
    } catch (err) {
      console.error(err);
      setIsOrganizing(false);
    }
  };

  const handleStartTournament = async () => {
    if (!id || rounds.length === 0) return;
    const ok = await confirmModal.confirm({
      title: '🚀 Iniciar torneo',
      message: 'La primera ronda se habilitará y los participantes podrán comenzar a jugar.',
      confirmText: '¡Iniciar!',
      variant: 'success',
    });
    if (!ok) return;
    setIsOrganizing(true);
    try {
      await updateTournament(id, { status: 'in_progress' });
      await startRound(rounds[0].id);
      navigate(`/tournament/${id}/bracket`);
    } catch (err) {
      console.error(err);
      setIsOrganizing(false);
    }
  };

  const handlePauseTournament = async () => {
    if (!id) return;
    try {
      await updateTournament(id, { status: 'paused' });
      await loadData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleResumeTournament = async () => {
    if (!id) return;
    try {
      await updateTournament(id, { status: 'in_progress' });
      await loadData();
    } catch (err) {
      console.error(err);
    }
  };

  // ============ MODAL HELPERS ============

  const closeModal = () => {
    setModal(null);
    setTeamName('');
    setTeamColor(TRN_TEAM_COLORS[0]);
    setTeamAvatar(TRN_TEAM_AVATARS[0]);
    setParticipantName('');
    setParticipantAvatar(AVATARS[0]);
    setEditingTeamId(null);
    setEditingParticipantId(null);
    setTargetTeamId(null);
  };

  const openEditTeam = (team: TrnTeamWithParticipants) => {
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

  const openEditParticipant = (p: TrnParticipant) => {
    setEditingParticipantId(p.id);
    setParticipantName(p.name);
    setParticipantAvatar(p.avatar);
    setModal('edit-participant');
  };

  const openEditTournament = () => {
    if (!tournament) return;
    setEditName(tournament.name);
    setEditDescription(tournament.description ?? '');
    setEditDate(tournament.date);
    setModal('edit-tournament');
  };

  // ============ RENDER ============

  if (isLoading) return <div className="trndetail__loading">⏳ Cargando torneo...</div>;
  if (!tournament) return <div className="trndetail__loading">❌ Torneo no encontrado</div>;
  if (isOrganizing) return <div className="trndetail__loading">🎲 Organizando bracket... Esto puede tomar unos segundos</div>;

  const canAddTeams = tournament.status === 'pending';
  const canEditParticipants = tournament.status === 'pending' || tournament.status === 'organizing' || tournament.status === 'paused';
  const canOrganize = tournament.status === 'pending' && teams.length === tournament.size;
  const canStart = tournament.status === 'organizing' && rounds.length > 0;
  const isActive = tournament.status === 'in_progress' || tournament.status === 'organizing' || tournament.status === 'paused';

  return (
    <div className="trndetail">
      {/* Brand animated */}
      <motion.div
        className="trndetail__brand"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <motion.span
          className="trndetail__brand-icon"
          animate={{ rotateY: [0, 360] }}
          transition={{ duration: 6, repeat: Infinity, ease: 'linear' }}
        >
          🧠
        </motion.span>
        <motion.span
          className="trndetail__brand-brain"
          initial={{ x: -20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}
        >
          BRAIN
        </motion.span>
        <motion.span
          className="trndetail__brand-clash"
          initial={{ x: 20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.5 }}
        >
          CLASH
        </motion.span>
        <motion.span
          className="trndetail__brand-adl"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
        >
          ADL
        </motion.span>
      </motion.div>

      {/* Header */}
      <div className="trndetail__header">
        <button className="trndetail__back" onClick={() => navigate('/tournaments')}>← Torneos</button>
        <div className="trndetail__header-info">
          <h1 className="trndetail__title">{tournament.name}</h1>
          {tournament.description && <p className="trndetail__desc">{tournament.description}</p>}
          <p className="trndetail__date">
            📅 {new Date(tournament.date + 'T00:00:00').toLocaleDateString('es-CO', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            &nbsp;•&nbsp;⚔️ {tournament.size} equipos
          </p>
        </div>
        <div className="trndetail__header-actions">
          {isAdmin && tournament.status === 'pending' && (
            <motion.button className="trndetail__action-btn trndetail__action-btn--edit" onClick={openEditTournament} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              ✏️ Editar
            </motion.button>
          )}
          {isAdmin && canOrganize && (
            <motion.button
              className="trndetail__action-btn trndetail__action-btn--organize"
              onClick={handleOrganize}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              disabled={isOrganizing}
            >
              {isOrganizing ? '⏳ Organizando...' : '🎲 Organizar Bracket'}
            </motion.button>
          )}
          {isAdmin && canStart && (
            <motion.button className="trndetail__action-btn trndetail__action-btn--start" onClick={handleStartTournament} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              🚀 Iniciar Torneo
            </motion.button>
          )}
          {(tournament.status === 'in_progress' || tournament.status === 'paused' || tournament.status === 'organizing') && (
            <motion.button className="trndetail__action-btn trndetail__action-btn--play" onClick={() => navigate(`/tournament/${id}/play`)} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              🎮 Jugar
            </motion.button>
          )}
          {(isActive || tournament.status === 'finished') && (
            <motion.button className="trndetail__action-btn trndetail__action-btn--bracket" onClick={() => navigate(`/tournament/${id}/bracket`)} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              🏆 Ver Bracket
            </motion.button>
          )}
          {isAdmin && tournament.status === 'in_progress' && (
            <motion.button className="trndetail__action-btn trndetail__action-btn--pause" onClick={handlePauseTournament} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              ⏸️ Pausar
            </motion.button>
          )}
          {isAdmin && tournament.status === 'paused' && (
            <motion.button className="trndetail__action-btn trndetail__action-btn--resume" onClick={handleResumeTournament} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              ▶️ Reanudar
            </motion.button>
          )}
          {isAdmin && tournament.status === 'pending' && (
            <motion.button className="trndetail__action-btn trndetail__action-btn--delete" onClick={handleDeleteTournament} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              🗑️
            </motion.button>
          )}
        </div>
      </div>

      {/* Teams progress */}
      <div className="trndetail__progress">
        <div className="trndetail__progress-bar">
          <div className="trndetail__progress-fill" style={{ width: `${(teams.length / tournament.size) * 100}%` }} />
        </div>
        <span className="trndetail__progress-text">{teams.length} / {tournament.size} equipos registrados</span>
      </div>

      {/* Teams section */}
      <div className="trndetail__section">
        <div className="trndetail__section-header">
          <h2>⚔️ Equipos</h2>
          {canAddTeams && teams.length < tournament.size && (
            <motion.button className="trndetail__add-team-btn" onClick={() => setModal('create-team')} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              + Agregar Equipo
            </motion.button>
          )}
        </div>

        {teams.length === 0 ? (
          <div className="trndetail__empty-teams">
            <p>No hay equipos registrados aún</p>
            <p className="trndetail__empty-hint">Registra {tournament.size} equipos para organizar el bracket</p>
          </div>
        ) : (
          <div className="trndetail__teams-grid">
            {teams.map((team, idx) => (
              <motion.div
                key={team.id}
                className={`trndetail__team-card ${team.is_eliminated ? 'trndetail__team-card--eliminated' : ''}`}
                style={{ borderColor: team.color }}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.03 }}
              >
                <div className="trndetail__team-header">
                  <span className="trndetail__team-avatar">{team.avatar}</span>
                  <div style={{ flex: 1 }}>
                    <h3 className="trndetail__team-name" style={{ color: team.color }}>{team.name}</h3>
                    {team.seed && <span className="trndetail__team-seed">Seed #{team.seed} • {team.bracket_side === 'left' ? '◀️' : '▶️'}</span>}
                    {team.is_eliminated && <span className="trndetail__team-eliminated">❌ Eliminado</span>}
                    {team.final_position && <span className="trndetail__team-position">{team.final_position === 1 ? '🥇' : team.final_position === 2 ? '🥈' : team.final_position === 3 ? '🥉' : '4°'}</span>}
                  </div>
                  {isAdmin && canAddTeams && (
                    <div className="trndetail__team-actions">
                      <button onClick={() => openEditTeam(team)} title="Editar">✏️</button>
                      <button onClick={() => handleDeleteTeam(team.id)} title="Eliminar">🗑️</button>
                    </div>
                  )}
                </div>

                <div className="trndetail__participants">
                  {team.participants.map((p) => (
                    <div key={p.id} className="trndetail__participant">
                      <span>{p.avatar}</span>
                      <span style={{ flex: 1 }}>{p.name}</span>
                      {isAdmin && canEditParticipants && (
                        <>
                          <button className="trndetail__participant-edit" onClick={() => openEditParticipant(p)}>✏️</button>
                          <button className="trndetail__participant-edit" onClick={() => handleDeleteParticipant(p.id)}>✕</button>
                        </>
                      )}
                    </div>
                  ))}
                  {canEditParticipants && (
                    <button className="trndetail__add-participant" onClick={() => openAddParticipant(team.id)}>
                      + Agregar participante
                    </button>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Rounds info (if organized) */}
      {rounds.length > 0 && (
        <div className="trndetail__section">
          <div className="trndetail__rounds">
            {rounds.map((round) => (
              <div key={round.id} className={`trndetail__round ${round.status === 'in_progress' ? 'trndetail__round--active' : ''} ${round.status === 'finished' ? 'trndetail__round--finished' : ''}`}>
                <span className="trndetail__round-name">{round.display_name}</span>
                <span className="trndetail__round-matches">{round.completed_matches}/{round.total_matches} matches</span>
                <span className={`trndetail__round-status trndetail__round-status--${round.status}`}>
                  {round.status === 'pending' ? '⏳' : round.status === 'in_progress' ? '🟢' : '✅'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modals */}
      <AnimatePresence>
        {modal && (
          <motion.div className="trndetail__overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={closeModal}>
            <motion.div className="trndetail__modal" initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }} onClick={(e) => e.stopPropagation()}>

              {/* Create/Edit Team */}
              {(modal === 'create-team' || modal === 'edit-team') && (
                <>
                  <h2 className="trndetail__modal-title">{modal === 'create-team' ? '➕ Nuevo Equipo' : '✏️ Editar Equipo'}</h2>
                  <div className="trndetail__field">
                    <label>Nombre del equipo</label>
                    <input type="text" placeholder="Ej: Los Dragones" value={teamName} onChange={(e) => setTeamName(e.target.value)} autoFocus />
                  </div>
                  <div className="trndetail__field">
                    <label>Color</label>
                    <div className="trndetail__color-grid">
                      {TRN_TEAM_COLORS.map((c) => (
                        <button key={c} className={`trndetail__color-btn ${teamColor === c ? 'trndetail__color-btn--active' : ''}`} style={{ background: c }} onClick={() => setTeamColor(c)} />
                      ))}
                    </div>
                  </div>
                  <div className="trndetail__field">
                    <label>Avatar</label>
                    <div className="trndetail__avatar-grid">
                      {TRN_TEAM_AVATARS.map((a) => (
                        <button key={a} className={`trndetail__avatar-btn ${teamAvatar === a ? 'trndetail__avatar-btn--active' : ''}`} onClick={() => setTeamAvatar(a)}>{a}</button>
                      ))}
                    </div>
                  </div>
                  <div className="trndetail__modal-actions">
                    <button className="trndetail__btn--secondary" onClick={closeModal}>Cancelar</button>
                    <button className="trndetail__btn--primary" onClick={modal === 'create-team' ? handleCreateTeam : handleEditTeam} disabled={!teamName.trim()}>
                      {modal === 'create-team' ? '➕ Crear' : '💾 Guardar'}
                    </button>
                  </div>
                </>
              )}

              {/* Add/Edit Participant */}
              {(modal === 'add-participant' || modal === 'edit-participant') && (
                <>
                  <h2 className="trndetail__modal-title">{modal === 'add-participant' ? '👤 Agregar Participante' : '✏️ Editar Participante'}</h2>
                  <div className="trndetail__field">
                    <label>Nombre</label>
                    <input type="text" placeholder="Ej: Juan" value={participantName} onChange={(e) => setParticipantName(e.target.value)} autoFocus />
                  </div>
                  <div className="trndetail__field">
                    <label>Avatar</label>
                    <div className="trndetail__avatar-grid">
                      {AVATARS.map((a) => (
                        <button key={a} className={`trndetail__avatar-btn ${participantAvatar === a ? 'trndetail__avatar-btn--active' : ''}`} onClick={() => setParticipantAvatar(a)}>{a}</button>
                      ))}
                    </div>
                  </div>
                  <div className="trndetail__modal-actions">
                    <button className="trndetail__btn--secondary" onClick={closeModal}>Cancelar</button>
                    <button className="trndetail__btn--primary" onClick={modal === 'add-participant' ? handleAddParticipant : handleEditParticipant} disabled={!participantName.trim()}>
                      {modal === 'add-participant' ? '➕ Agregar' : '💾 Guardar'}
                    </button>
                  </div>
                </>
              )}

              {/* Edit Tournament */}
              {modal === 'edit-tournament' && (
                <>
                  <h2 className="trndetail__modal-title">✏️ Editar Torneo</h2>
                  <div className="trndetail__field">
                    <label>Nombre</label>
                    <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} autoFocus />
                  </div>
                  <div className="trndetail__field">
                    <label>Descripción</label>
                    <input type="text" value={editDescription} onChange={(e) => setEditDescription(e.target.value)} />
                  </div>
                  <div className="trndetail__field">
                    <label>📅 Fecha</label>
                    <input type="date" value={editDate} onChange={(e) => setEditDate(e.target.value)} />
                  </div>
                  <div className="trndetail__modal-actions">
                    <button className="trndetail__btn--secondary" onClick={closeModal}>Cancelar</button>
                    <button className="trndetail__btn--primary" onClick={handleEditTournament} disabled={!editName.trim()}>💾 Guardar</button>
                  </div>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Confirm Modal */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmText={confirmModal.confirmText}
        cancelText={confirmModal.cancelText}
        variant={confirmModal.variant}
        onConfirm={confirmModal.onConfirm}
        onCancel={confirmModal.cancel}
      />
    </div>
  );
}
