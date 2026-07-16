import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { getGameday, getTeamsByGameday, getTeamLeaderboard, subscribeToScores } from 'modules/shared/services/supabase/gameday.service';
import { subscribeToLiveScores, type LiveScoreRow } from 'modules/shared/services/supabase/liveScore.service';
import type { Gameday, Team, TeamLeaderboardEntry } from 'modules/shared/types/gameday.types';
import './DashboardPage.css';

export default function DashboardPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [gameday, setGameday] = useState<Gameday | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [leaderboard, setLeaderboard] = useState<TeamLeaderboardEntry[]>([]);
  const [liveScores, setLiveScores] = useState<LiveScoreRow[]>([]);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [expandedTeam, setExpandedTeam] = useState<string | null>(null);

  const refreshLeaderboard = useCallback(async () => {
    if (!id) return;
    const lb = await getTeamLeaderboard(id);
    setLeaderboard(lb);
    setLastUpdate(new Date());
  }, [id]);

  useEffect(() => {
    if (!id) return;
    getGameday(id).then((gd) => setGameday(gd as Gameday));
    getTeamsByGameday(id).then((t) => setTeams(t as Team[]));
    refreshLeaderboard();
  }, [id, refreshLeaderboard]);

  // Subscribe to final scores
  useEffect(() => {
    if (!id) return;
    const unsubscribe = subscribeToScores(id, refreshLeaderboard);
    return unsubscribe;
  }, [id, refreshLeaderboard]);

  // Subscribe to LIVE scores
  useEffect(() => {
    if (!id) return;
    const unsubscribe = subscribeToLiveScores(id, (scores) => {
      setLiveScores(scores);
      setLastUpdate(new Date());
    });
    return unsubscribe;
  }, [id]);

  // Build team data with live participants
  const getTeamData = () => {
    const allTeamIds = new Set([
      ...leaderboard.map((lb) => lb.team_id),
      ...teams.map((t) => t.id),
    ]);

    return Array.from(allTeamIds)
      .map((teamId) => {
        const lb = leaderboard.find((l) => l.team_id === teamId);
        const team = teams.find((t) => t.id === teamId);
        const participants = liveScores.filter((ls) => ls.team_id === teamId);
        const liveScore = participants.reduce((s, p) => s + p.current_score, 0);
        const activeScore = participants.filter((p) => p.is_playing).reduce((s, p) => s + p.current_score, 0);

        // Use live_scores as primary source for total score (avoids double-counting)
        // leaderboard total_score is from completed games in `scores` table
        // live_scores has ALL current/completed scores for this session
        const displayScore = liveScore > 0 ? liveScore : (lb?.total_score ?? 0);

        return {
          team_id: teamId,
          team_name: lb?.team_name ?? team?.name ?? 'Equipo',
          team_color: lb?.team_color ?? team?.color ?? '#00f5ff',
          team_avatar: lb?.team_avatar ?? team?.avatar ?? '🦊',
          total_score: displayScore,
          final_score: lb?.total_score ?? 0,
          live_score: activeScore,
          total_correct: lb?.total_correct ?? 0,
          best_streak: lb?.best_streak ?? 0,
          games_played: lb?.games_played ?? 0,
          participants,
          playingNow: participants.filter((p) => p.is_playing).length,
        };
      })
      .filter((t) => t.total_score > 0 || t.participants.length > 0)
      .sort((a, b) => b.total_score - a.total_score);
  };

  const teamData = getTeamData();
  const maxScore = Math.max(...teamData.map((t) => t.total_score), 1);
  const playingNow = liveScores.filter((ls) => ls.is_playing).length;

  return (
    <div className="dashboard">
      <div className="dashboard__nav">
        <button className="dashboard__back" onClick={() => navigate(`/gameday/${id}`)}>
          ← Volver al GameDay
        </button>
        <button className="dashboard__play-link" onClick={() => navigate(`/gameday/${id}/play`)}>
          🎮 Ir a jugar
        </button>
      </div>

      {/* Header */}
      <div className="dashboard__header">
        <motion.div
          className="dashboard__logo"
          animate={{ rotateY: [0, 360] }}
          transition={{ duration: 10, repeat: Infinity, ease: 'linear' }}
        >
          🏆
        </motion.div>
        <h1 className="dashboard__title">{gameday?.name ?? 'GameDay'}</h1>
        <p className="dashboard__subtitle">BATALLA EN VIVO</p>
        <div className="dashboard__live-indicator">
          <span className="dashboard__live-dot" />
          <span>{playingNow} jugando ahora</span>
          <span className="dashboard__update-time">• {lastUpdate.toLocaleTimeString()}</span>
        </div>
      </div>

      {/* Leaderboard */}
      <div className="dashboard__leaderboard">
        <AnimatePresence>
          {teamData.map((entry, index) => (
            <motion.div
              key={entry.team_id}
              className={`dashboard__team-block ${expandedTeam === entry.team_id ? 'dashboard__team-block--expanded' : ''}`}
              style={{ '--team-color': entry.team_color } as React.CSSProperties}
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.08 }}
              layout
            >
              {/* Main row */}
              <div
                className="dashboard__team-row"
                onClick={() => setExpandedTeam(expandedTeam === entry.team_id ? null : entry.team_id)}
              >
                {/* Position */}
                <div className="dashboard__position">
                  {index === 0 && <span className="dashboard__medal">🥇</span>}
                  {index === 1 && <span className="dashboard__medal">🥈</span>}
                  {index === 2 && <span className="dashboard__medal">🥉</span>}
                  {index > 2 && <span className="dashboard__rank">#{index + 1}</span>}
                </div>

                {/* Team info */}
                <div className="dashboard__team-info">
                  <span className="dashboard__team-avatar">{entry.team_avatar}</span>
                  <div className="dashboard__team-details">
                    <h3 className="dashboard__team-name" style={{ color: entry.team_color }}>
                      {entry.team_name}
                    </h3>
                    <div className="dashboard__team-stats">
                      <span>✅ {entry.total_correct}</span>
                      <span>🔥 {entry.best_streak}</span>
                      <span>🎮 {entry.games_played}</span>
                      {entry.playingNow > 0 && (
                        <span className="dashboard__playing-badge">⚡ {entry.playingNow} jugando</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Score */}
                <div className="dashboard__score-section">
                  <div className="dashboard__score-bar-container">
                    <motion.div
                      className="dashboard__score-bar"
                      style={{ background: entry.team_color }}
                      animate={{ width: `${(entry.total_score / maxScore) * 100}%` }}
                      transition={{ duration: 0.5 }}
                    />
                  </div>
                  <div className="dashboard__score-values">
                    <span className="dashboard__score-value" style={{ color: entry.team_color }}>
                      {entry.total_score.toLocaleString()}
                    </span>
                    {entry.live_score > 0 && (
                      <span className="dashboard__score-live">+{entry.live_score} en vivo</span>
                    )}
                  </div>
                </div>

                {/* Expand arrow */}
                <span className={`dashboard__expand-arrow ${expandedTeam === entry.team_id ? 'dashboard__expand-arrow--open' : ''}`}>
                  ▾
                </span>
              </div>

              {/* Expanded: Participants detail */}
              <AnimatePresence>
                {expandedTeam === entry.team_id && entry.participants.length > 0 && (
                  <motion.div
                    className="dashboard__participants-panel"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <div className="dashboard__participants-grid">
                      {entry.participants.map((p) => (
                        <div
                          key={p.participant_id}
                          className={`dashboard__participant-card ${p.is_playing ? 'dashboard__participant-card--playing' : ''}`}
                        >
                          <div className="dashboard__participant-header">
                            <span className="dashboard__participant-avatar">{p.participant_avatar ?? '🦊'}</span>
                            <div className="dashboard__participant-info">
                              <span className="dashboard__participant-name">{p.participant_name ?? 'Jugador'}</span>
                              {p.is_playing && <span className="dashboard__participant-live">⚡ EN VIVO</span>}
                              {!p.is_playing && <span className="dashboard__participant-done">✓ Terminó</span>}
                            </div>
                          </div>

                          <div className="dashboard__participant-stats">
                            <div className="dashboard__participant-stat">
                              <span className="dashboard__participant-stat-value">⭐ {p.current_score}</span>
                              <span className="dashboard__participant-stat-label">Puntos</span>
                            </div>
                            <div className="dashboard__participant-stat">
                              <span className="dashboard__participant-stat-value">✅ {p.current_correct}/{p.total_questions}</span>
                              <span className="dashboard__participant-stat-label">Aciertos</span>
                            </div>
                            <div className="dashboard__participant-stat">
                              <span className="dashboard__participant-stat-value">📝 {p.current_question}/{p.total_questions}</span>
                              <span className="dashboard__participant-stat-label">Progreso</span>
                            </div>
                            {p.current_streak > 0 && (
                              <div className="dashboard__participant-stat">
                                <span className="dashboard__participant-stat-value">🔥 {p.current_streak}</span>
                                <span className="dashboard__participant-stat-label">Racha</span>
                              </div>
                            )}
                          </div>

                          {/* Category */}
                          {p.category_name && (
                            <div className="dashboard__participant-category">
                              🏷️ {p.category_name}
                            </div>
                          )}

                          {/* Progress bar */}
                          {p.is_playing && (
                            <div className="dashboard__participant-progress-bar">
                              <motion.div
                                className="dashboard__participant-progress-fill"
                                style={{ background: entry.team_color }}
                                animate={{ width: `${(p.current_question / p.total_questions) * 100}%` }}
                                transition={{ duration: 0.3 }}
                              />
                            </div>
                          )}

                          {/* Games completed */}
                          {(p.games_completed ?? 0) > 0 && (
                            <div className="dashboard__participant-games">
                              🎮 Juego #{(p.games_completed ?? 0) + 1}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </AnimatePresence>

        {teamData.length === 0 && (
          <div className="dashboard__empty">
            <span>⏳</span>
            <p>Esperando que los equipos jueguen...</p>
            <p className="dashboard__empty-hint">Los scores aparecerán aquí en tiempo real</p>
          </div>
        )}
      </div>
    </div>
  );
}
