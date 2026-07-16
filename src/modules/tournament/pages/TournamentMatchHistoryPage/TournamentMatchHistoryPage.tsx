import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  getTournament,
  getRoundsByTournament,
  getMatchesByRound,
  getMatchScores,
  getTrnTeamsByTournament,
  getTrnParticipantsByTeam,
} from 'modules/shared/services/supabase/tournament.service';
import type { Tournament, TrnRound, TrnMatch, TrnMatchScore, TrnTeam, TrnParticipant } from 'modules/shared/types/tournament.types';
import './TournamentMatchHistoryPage.css';

interface MatchDetail {
  match: TrnMatch;
  teamA: TrnTeam | null;
  teamB: TrnTeam | null;
  scores: TrnMatchScore[];
}

interface ParticipantInfo {
  id: string;
  name: string;
  avatar: string;
  teamId: string;
}

export default function TournamentMatchHistoryPage() {
  const { id: tournamentId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [rounds, setRounds] = useState<TrnRound[]>([]);
  const [matchesByRound, setMatchesByRound] = useState<Record<string, MatchDetail[]>>({});
  const [participants, setParticipants] = useState<Record<string, ParticipantInfo>>({});
  const [selectedRound, setSelectedRound] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!tournamentId) return;
    const load = async () => {
      try {
        const [trn, roundsList, teams] = await Promise.all([
          getTournament(tournamentId),
          getRoundsByTournament(tournamentId),
          getTrnTeamsByTournament(tournamentId),
        ]);
        setTournament(trn);
        setRounds(roundsList);

        // Build participants map
        const pMap: Record<string, ParticipantInfo> = {};
        for (const team of teams) {
          const ps = await getTrnParticipantsByTeam(team.id);
          for (const p of ps) {
            pMap[p.id] = { id: p.id, name: p.name, avatar: p.avatar, teamId: team.id };
          }
        }
        setParticipants(pMap);

        // Build team map
        const teamMap: Record<string, TrnTeam> = {};
        for (const t of teams) teamMap[t.id] = t;

        // Load matches + scores for all rounds
        const mbr: Record<string, MatchDetail[]> = {};
        for (const round of roundsList) {
          const matches = await getMatchesByRound(round.id);
          const details: MatchDetail[] = [];
          for (const match of matches) {
            const scores = await getMatchScores(match.id);
            details.push({
              match,
              teamA: match.team_a_id ? teamMap[match.team_a_id] ?? null : null,
              teamB: match.team_b_id ? teamMap[match.team_b_id] ?? null : null,
              scores,
            });
          }
          mbr[round.id] = details;
        }
        setMatchesByRound(mbr);

        // Select the first round with finished matches
        const firstFinished = roundsList.find(r => r.status === 'finished');
        setSelectedRound(firstFinished?.id ?? roundsList[0]?.id ?? null);
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [tournamentId]);

  if (isLoading) return <div className="mhist__loading">⏳ Cargando historial...</div>;
  if (!tournament) return <div className="mhist__loading">❌ Torneo no encontrado</div>;

  const currentRound = rounds.find(r => r.id === selectedRound);
  const currentMatches = selectedRound ? matchesByRound[selectedRound] ?? [] : [];

  return (
    <div className="mhist">
      <button className="mhist__back" onClick={() => navigate(`/tournament/${tournamentId}/bracket`)}>← Bracket</button>
      <h1 className="mhist__title">📊 Seguimiento del Torneo</h1>
      <p className="mhist__subtitle">{tournament.name}</p>

      {/* Round tabs */}
      <div className="mhist__tabs">
        {rounds.map(round => (
          <button
            key={round.id}
            className={`mhist__tab ${selectedRound === round.id ? 'mhist__tab--active' : ''} ${round.status === 'finished' ? 'mhist__tab--finished' : ''}`}
            onClick={() => setSelectedRound(round.id)}
          >
            {round.display_name}
            {round.status === 'finished' && ' ✅'}
            {round.status === 'in_progress' && ' 🟢'}
          </button>
        ))}
        {tournament.status === 'finished' && (
          <button
            className="mhist__tab mhist__tab--champion"
            onClick={() => navigate(`/tournament/${tournamentId}/champion`)}
          >
            🏆 Campeón
          </button>
        )}
      </div>

      {/* Matches for selected round */}
      {currentRound && (
        <div className="mhist__content">
          <h2 className="mhist__round-title">{currentRound.display_name}</h2>

          {currentMatches.length === 0 ? (
            <p className="mhist__empty">Sin matches para esta ronda</p>
          ) : (
            <div className="mhist__matches">
              {currentMatches.map(({ match, teamA, teamB, scores }) => {
                const teamAScores = scores.filter(s => s.team_id === match.team_a_id);
                const teamBScores = scores.filter(s => s.team_id === match.team_b_id);
                const teamATotal = teamAScores.reduce((sum, s) => sum + s.score, 0);
                const teamBTotal = teamBScores.reduce((sum, s) => sum + s.score, 0);
                const isFinished = match.status === 'finished';

                return (
                  <motion.div
                    key={match.id}
                    className="mhist__match"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    {/* Match header */}
                    <div className="mhist__match-header">
                      <div className="mhist__match-team" style={{ borderColor: teamA?.color }}>
                        <span>{teamA?.avatar ?? '❓'}</span>
                        <span style={{ color: teamA?.color }}>{teamA?.name ?? 'TBD'}</span>
                        <span className="mhist__match-total">{teamATotal}</span>
                        {match.winner_id === match.team_a_id && <span className="mhist__winner-badge">🏆</span>}
                      </div>
                      <span className="mhist__vs">VS</span>
                      <div className="mhist__match-team" style={{ borderColor: teamB?.color }}>
                        <span>{teamB?.avatar ?? '❓'}</span>
                        <span style={{ color: teamB?.color }}>{teamB?.name ?? 'TBD'}</span>
                        <span className="mhist__match-total">{teamBTotal}</span>
                        {match.winner_id === match.team_b_id && <span className="mhist__winner-badge">🏆</span>}
                      </div>
                    </div>

                    {/* Status */}
                    {!isFinished && scores.length === 0 && (
                      <p className="mhist__pending">⏳ Sin resultados aún</p>
                    )}

                    {/* Participant breakdown */}
                    {scores.length > 0 && (
                      <div className="mhist__breakdown">
                        <table className="mhist__table">
                          <thead>
                            <tr>
                              <th>Participante</th>
                              <th>Equipo</th>
                              <th>Puntos</th>
                              <th>✅</th>
                              <th>❌</th>
                              <th>Total</th>
                              <th>🔥</th>
                            </tr>
                          </thead>
                          <tbody>
                            {scores
                              .sort((a, b) => b.score - a.score)
                              .map(s => {
                                const p = participants[s.participant_id];
                                const team = s.team_id === match.team_a_id ? teamA : teamB;
                                const wrong = s.total_questions - s.correct_answers;
                                return (
                                  <tr key={s.id} className={match.winner_id === s.team_id ? 'mhist__row--winner' : ''}>
                                    <td>
                                      <span className="mhist__p-cell">
                                        {p?.avatar ?? '👤'} {p?.name ?? 'Desconocido'}
                                      </span>
                                    </td>
                                    <td style={{ color: team?.color }}>{team?.name ?? '-'}</td>
                                    <td className="mhist__score-cell">{s.score}</td>
                                    <td>{s.correct_answers}</td>
                                    <td>{wrong}</td>
                                    <td>{s.total_questions}</td>
                                    <td>{s.best_streak}</td>
                                  </tr>
                                );
                              })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
