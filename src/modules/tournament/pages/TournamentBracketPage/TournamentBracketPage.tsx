import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  getTournament,
  getBracket,
  getRoundsByTournament,
  subscribeToMatches,
  subscribeToRounds,
  startRound,
  finishMatch,
  finishTournament,
  isMatchComplete,
  updateTournament,
  getMatchesByTournament,
  simulateRound,
  forceFinishRound,
} from 'modules/shared/services/supabase/tournament.service';
import { supabase } from 'modules/shared/services/supabase/supabaseClient';
import { useAdmin } from 'modules/shared/context/AdminContext';
import { useConfirm } from 'modules/shared/hooks/useConfirm';
import ConfirmModal from 'modules/shared/components/ConfirmModal/ConfirmModal';
import type { Tournament, BracketMatch, TrnRound } from 'modules/shared/types/tournament.types';
import './TournamentBracketPage.css';

export default function TournamentBracketPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isAdmin } = useAdmin();
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [bracket, setBracket] = useState<BracketMatch[]>([]);
  const [rounds, setRounds] = useState<TrnRound[]>([]);
  const [liveScores, setLiveScores] = useState<Record<string, { teamA: number; teamB: number }>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSimulating, setIsSimulating] = useState(false);
  const [simResults, setSimResults] = useState<{ teamAName: string; teamBName: string; teamAScore: number; teamBScore: number }[] | null>(null);
  const confirmModal = useConfirm();

  const loadData = useCallback(async () => {
    if (!id) return;
    try {
      const [trn, bracketData, roundsData] = await Promise.all([
        getTournament(id),
        getBracket(id),
        getRoundsByTournament(id),
      ]);
      setTournament(trn);
      setBracket(bracketData);
      setRounds(roundsData);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => { loadData(); }, [loadData]);

  // Load live scores for in-progress matches
  const loadLiveScores = useCallback(async () => {
    if (!id) return;
    try {
      const matches = await getMatchesByTournament(id);
      const inProgressMatches = matches.filter(m => m.status === 'in_progress');
      const scores: Record<string, { teamA: number; teamB: number }> = {};

      for (const match of inProgressMatches) {
        // Get completed game scores (trn_match_scores - finished games)
        const { data: finishedScores } = await supabase
          .from('trn_match_scores')
          .select('team_id, score')
          .eq('match_id', match.id);

        let teamAFinished = 0;
        let teamBFinished = 0;
        for (const row of finishedScores ?? []) {
          if (row.team_id === match.team_a_id) teamAFinished += row.score;
          else if (row.team_id === match.team_b_id) teamBFinished += row.score;
        }

        // Get live scores ONLY from participants currently playing (not finished)
        const { data: liveData } = await supabase
          .from('trn_live_scores')
          .select('team_id, current_score')
          .eq('match_id', match.id)
          .eq('is_playing', true);

        let teamALive = 0;
        let teamBLive = 0;
        for (const row of liveData ?? []) {
          if (row.team_id === match.team_a_id) teamALive += row.current_score;
          else if (row.team_id === match.team_b_id) teamBLive += row.current_score;
        }

        // Total = finished games + current games in progress
        scores[match.id] = {
          teamA: teamAFinished + teamALive,
          teamB: teamBFinished + teamBLive,
        };
      }
      setLiveScores(scores);
    } catch (err) {
      console.error(err);
    }
  }, [id]);

  useEffect(() => { loadLiveScores(); }, [loadLiveScores]);

  // Real-time subscriptions
  useEffect(() => {
    if (!id) return;
    const unsub1 = subscribeToMatches(id, () => { loadData(); loadLiveScores(); });
    const unsub2 = subscribeToRounds(id, loadData);

    // Subscribe to live scores (in-progress games) + match scores (finished games)
    const channelLive = supabase
      .channel(`trn-live-${id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'trn_live_scores', filter: `tournament_id=eq.${id}` },
        () => loadLiveScores(),
      )
      .subscribe();

    const channelScores = supabase
      .channel(`trn-scores-${id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'trn_match_scores', filter: `tournament_id=eq.${id}` },
        () => loadLiveScores(),
      )
      .subscribe();

    return () => { unsub1(); unsub2(); supabase.removeChannel(channelLive); supabase.removeChannel(channelScores); };
  }, [id, loadData, loadLiveScores]);

  const handleFinishMatch = async (matchId: string) => {
    const complete = await isMatchComplete(matchId);
    if (!complete) {
      const ok = await confirmModal.confirm({
        title: '🏁 Finalizar enfrentamiento',
        message: 'No todos los participantes han terminado. ¿Finalizar con los puntos actuales?',
        confirmText: 'Sí, finalizar',
        variant: 'danger',
      });
      if (!ok) return;
    }
    try {
      await finishMatch(matchId);
      await loadData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleStartNextRound = async (roundId: string) => {
    const round = rounds.find(r => r.id === roundId);
    const ok = await confirmModal.confirm({
      title: '▶️ Iniciar siguiente ronda',
      message: `¿Iniciar ${round?.display_name ?? 'la siguiente ronda'}? Los equipos podrán comenzar a jugar.`,
      confirmText: '¡Iniciar!',
      variant: 'success',
    });
    if (!ok) return;
    try {
      await startRound(roundId);
      if (id) await updateTournament(id, { current_round_id: roundId });
      await loadData();
    } catch (err) { console.error(err); }
  };

  const handleFinishTournament = async () => {
    if (!id) return;
    const ok = await confirmModal.confirm({
      title: '🏆 Finalizar torneo',
      message: '¿Declarar el campeón y finalizar el torneo? Esta acción no se puede deshacer.',
      confirmText: 'Declarar campeón',
      variant: 'success',
    });
    if (!ok) return;
    try {
      await finishTournament(id);
      navigate(`/tournament/${id}/champion`);
    } catch (err) { console.error(err); }
  };

  const handleSimulate = async () => {
    if (!id) return;
    const ok = await confirmModal.confirm({
      title: '🤖 Simular ronda',
      message: 'Se generarán scores aleatorios para todos los participantes de la ronda actual.',
      confirmText: 'Simular',
      variant: 'default',
    });
    if (!ok) return;
    setIsSimulating(true);
    setSimResults(null);
    try {
      const { results } = await simulateRound(id);
      setSimResults(results);
      await loadData();
      await loadLiveScores();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSimulating(false);
    }
  };

  const handleForceFinishRound = async () => {
    if (!id) return;
    const ok = await confirmModal.confirm({
      title: '🏁 Finalizar ronda',
      message: 'Se cerrarán todos los enfrentamientos con los puntos actuales. Los equipos que no hayan jugado quedarán con 0.',
      confirmText: 'Finalizar ronda',
      variant: 'danger',
    });
    if (!ok) return;
    try {
      await forceFinishRound(id);
      await loadData();
    } catch (err) {
      console.error(err);
    }
  };

  if (isLoading) return <div className="bracket__loading">⏳ Cargando bracket...</div>;
  if (!tournament) return <div className="bracket__loading">❌ Torneo no encontrado</div>;

  // Organize data
  const regularRounds = rounds.filter(r => r.name !== 'third_place' && r.name !== 'final');
  const thirdPlaceRound = rounds.find(r => r.name === 'third_place');
  const finalRound = rounds.find(r => r.name === 'final');

  const activeRound = rounds.find(r => r.status === 'in_progress');
  const nextPendingRound = rounds.find(r => r.status === 'pending');
  const isActiveRoundComplete = activeRound && activeRound.completed_matches >= activeRound.total_matches;
  const allRoundsFinished = rounds.every(r => r.status === 'finished');
  // Show "start next round" when: active round finished OR no active round but there's a pending one
  const showStartNext = nextPendingRound && (isActiveRoundComplete || (!activeRound && !allRoundsFinished));

  // Build left and right columns (rounds converging to center)
  const leftColumns = regularRounds.map(r => ({
    ...r,
    matches: bracket.filter(m => m.round_id === r.id && m.bracket_side === 'left'),
  })).filter(r => r.matches.length > 0);

  const rightColumns = regularRounds.map(r => ({
    ...r,
    matches: bracket.filter(m => m.round_id === r.id && m.bracket_side === 'right'),
  })).filter(r => r.matches.length > 0);

  const finalMatch = bracket.find(m => m.round_id === finalRound?.id);
  const thirdMatch = bracket.find(m => m.round_id === thirdPlaceRound?.id);

  return (
    <div className="bracket">
      {/* Floating Brand */}
      <motion.div className="bracket__brand" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.3 }}>
        <motion.span className="bracket__brand-icon" animate={{ rotateY: [0, 360] }} transition={{ duration: 6, repeat: Infinity, ease: 'linear' }}>🧠</motion.span>
        <span className="bracket__brand-brain">BRAIN</span>
        <span className="bracket__brand-clash">CLASH</span>
        <span className="bracket__brand-adl">ADL</span>
        <span className="bracket__brand-separator">•</span>
        <span className="bracket__brand-tournament">{tournament.name}</span>
      </motion.div>

      {/* Header */}
      <div className="bracket__header">
        <div className="bracket__header-top">
          <button className="bracket__back" onClick={() => navigate(`/tournament/${id}`)}>← Torneo</button>
          <div className="bracket__header-links">
            {(tournament.status === 'in_progress' || tournament.status === 'paused') && (
              <button className="bracket__play-link" onClick={() => navigate(`/tournament/${id}/play`)}>🎮 Jugar</button>
            )}
            <button className="bracket__history-link" onClick={() => navigate(`/tournament/${id}/history`)}>📊 Seguimiento</button>
          </div>
        </div>

        <h1 className="bracket__title">🏆 {tournament.name}</h1>
        {activeRound && (
          <div className="bracket__round-info">
            <span className="bracket__current-round">{activeRound.display_name}</span>
            <span className="bracket__round-progress">{activeRound.completed_matches}/{activeRound.total_matches}</span>
          </div>
        )}
        {tournament.status === 'finished' && <span className="bracket__champion-badge">🏆 ¡Campeón coronado!</span>}
      </div>

      {/* Admin */}
      {isAdmin && (
        <div className="bracket__admin-actions">
          {showStartNext && nextPendingRound && (
            <motion.button className="bracket__admin-btn bracket__admin-btn--next" onClick={() => handleStartNextRound(nextPendingRound.id)} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              ▶️ {nextPendingRound.name === 'third_place' || nextPendingRound.name === 'final' ? 'Iniciar Final y 3er Puesto' : `Iniciar ${nextPendingRound.display_name}`}
            </motion.button>
          )}
          {activeRound && !isActiveRoundComplete && (
            <motion.button
              className="bracket__admin-btn bracket__admin-btn--simulate"
              onClick={handleSimulate}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              disabled={isSimulating}
            >
              {isSimulating ? '⏳ Simulando...' : '🤖 Simular Ronda'}
            </motion.button>
          )}
          {activeRound && (
            <motion.button
              className="bracket__admin-btn bracket__admin-btn--force-finish"
              onClick={handleForceFinishRound}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              🏁 Finalizar Ronda
            </motion.button>
          )}
          {allRoundsFinished && tournament.status !== 'finished' && (
            <motion.button className="bracket__admin-btn bracket__admin-btn--finish" onClick={handleFinishTournament} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              🏆 Declarar Campeón
            </motion.button>
          )}
        </div>
      )}

      {/* Simulation results */}
      {simResults && (
        <div className="bracket__sim-results">
          <h3 className="bracket__sim-title">🤖 Resultados de la simulación</h3>
          <div className="bracket__sim-list">
            {simResults.map((r, i) => (
              <div key={i} className="bracket__sim-row">
                <span className={r.teamAScore > r.teamBScore ? 'bracket__sim-winner' : ''}>{r.teamAName}</span>
                <span className="bracket__sim-score">{r.teamAScore} - {r.teamBScore}</span>
                <span className={r.teamBScore > r.teamAScore ? 'bracket__sim-winner' : ''}>{r.teamBName}</span>
              </div>
            ))}
          </div>
          <button className="bracket__sim-close" onClick={() => setSimResults(null)}>✕ Cerrar</button>
        </div>
      )}

      {/* ============ BRACKET TREE ============ */}
      <div className={`bracket__tree bracket__tree--size-${tournament.size}`}>
        {/* LEFT SIDE (converges right → center) */}
        <div className="bracket__half bracket__half--left">
          {leftColumns.map((round, rIdx) => (
            <div key={round.id} className="bracket__tree-round" style={{ '--round-gap': `${Math.pow(2, rIdx) * 0.5}rem` } as React.CSSProperties}>
              <span className="bracket__tree-round-name">{round.display_name}</span>
              <div className="bracket__tree-matches" style={{ gap: `${Math.pow(2, rIdx) * 1.5 + 1}rem` }}>
                {round.matches.map(match => (
                  <MatchChip key={match.match_id} match={match} isAdmin={isAdmin} liveScores={liveScores[match.match_id]} onFinish={() => handleFinishMatch(match.match_id)} />
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* CENTER - FINAL + 3RD PLACE */}
        <div className="bracket__finals-col">
          {finalMatch && (
            <div>
              <span className="bracket__final-label">🏆 FINAL</span>
              <MatchChip match={finalMatch} isAdmin={isAdmin} isFinal liveScores={liveScores[finalMatch.match_id]} onFinish={() => handleFinishMatch(finalMatch.match_id)} />
            </div>
          )}
          {thirdMatch && (
            <div>
              <span className="bracket__third-label">🥉 3ER PUESTO</span>
              <MatchChip match={thirdMatch} isAdmin={isAdmin} liveScores={liveScores[thirdMatch.match_id]} onFinish={() => handleFinishMatch(thirdMatch.match_id)} />
            </div>
          )}
        </div>

        {/* RIGHT SIDE (converges left → center) */}
        <div className="bracket__half bracket__half--right">
          {rightColumns.map((round, rIdx) => (
            <div key={round.id} className="bracket__tree-round" style={{ '--round-gap': `${Math.pow(2, rIdx) * 0.5}rem` } as React.CSSProperties}>
              <span className="bracket__tree-round-name">{round.display_name}</span>
              <div className="bracket__tree-matches" style={{ gap: `${Math.pow(2, rIdx) * 1.5 + 1}rem` }}>
                {round.matches.map(match => (
                  <MatchChip key={match.match_id} match={match} isAdmin={isAdmin} liveScores={liveScores[match.match_id]} onFinish={() => handleFinishMatch(match.match_id)} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

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

// ============ MATCH CHIP (compact team card) ============

interface MatchChipProps {
  match: BracketMatch;
  isAdmin: boolean;
  isFinal?: boolean;
  liveScores?: { teamA: number; teamB: number };
  onFinish: () => void;
}

function MatchChip({ match, isAdmin, isFinal, liveScores, onFinish }: MatchChipProps) {
  const isFinished = match.match_status === 'finished';
  const isInProgress = match.match_status === 'in_progress';

  // Use live scores for in-progress matches, otherwise use saved scores
  const teamAScore = isInProgress && liveScores ? liveScores.teamA : match.team_a_score;
  const teamBScore = isInProgress && liveScores ? liveScores.teamB : match.team_b_score;

  return (
    <div className={`mcard ${isFinal ? 'mcard--final' : ''} ${isInProgress ? 'mcard--live' : ''}`}>
      {/* Team A */}
      <div className={`mcard__team ${match.winner_id === match.team_a_id ? 'mcard__team--winner' : ''} ${isFinished && match.loser_id === match.team_a_id ? 'mcard__team--loser' : ''}`}>
        <span className="mcard__color-dot" style={{ background: match.team_a_color ?? 'var(--border)' }} />
        <span className="mcard__icon">{match.team_a_avatar ?? '❓'}</span>
        <span className="mcard__name">
          {match.team_a_name ?? 'TBD'}
        </span>
        <span className="mcard__score">{teamAScore}</span>
      </div>

      {/* Team B */}
      <div className={`mcard__team ${match.winner_id === match.team_b_id ? 'mcard__team--winner' : ''} ${isFinished && match.loser_id === match.team_b_id ? 'mcard__team--loser' : ''}`}>
        <span className="mcard__color-dot" style={{ background: match.team_b_color ?? 'var(--border)' }} />
        <span className="mcard__icon">{match.team_b_avatar ?? '❓'}</span>
        <span className="mcard__name">
          {match.team_b_name ?? 'TBD'}
        </span>
        <span className="mcard__score">{teamBScore}</span>
      </div>

      {/* Admin finish */}
      {isAdmin && isInProgress && (
        <button className="mcard__finish" onClick={onFinish} title="Finalizar">🏁</button>
      )}
    </div>
  );
}
