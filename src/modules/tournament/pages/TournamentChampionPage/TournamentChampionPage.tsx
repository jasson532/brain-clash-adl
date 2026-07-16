import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  getTournament,
  getTrnTeamsByTournament,
  getTrnParticipantsByTeam,
} from 'modules/shared/services/supabase/tournament.service';
import { supabase } from 'modules/shared/services/supabase/supabaseClient';
import type { Tournament, TrnTeam, TrnParticipant } from 'modules/shared/types/tournament.types';
import './TournamentChampionPage.css';

interface PodiumTeam {
  team: TrnTeam;
  totalScore: number;
  position: number;
  participants: ParticipantScore[];
}

interface ParticipantScore {
  participant: TrnParticipant;
  totalScore: number;
  totalCorrect: number;
  totalQuestions: number;
}

export default function TournamentChampionPage() {
  const { id: tournamentId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [podium, setPodium] = useState<PodiumTeam[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!tournamentId) return;
    const load = async () => {
      try {
        const trn = await getTournament(tournamentId);
        setTournament(trn);

        const teams = await getTrnTeamsByTournament(tournamentId);

        // Get all scores grouped by participant
        const { data: allScores } = await supabase
          .from('trn_match_scores')
          .select('team_id, participant_id, score, correct_answers, total_questions')
          .eq('tournament_id', tournamentId);

        // Aggregate per team and per participant
        const teamScores: Record<string, number> = {};
        const participantAgg: Record<string, { score: number; correct: number; total: number }> = {};

        for (const row of allScores ?? []) {
          teamScores[row.team_id] = (teamScores[row.team_id] ?? 0) + row.score;
          if (!participantAgg[row.participant_id]) {
            participantAgg[row.participant_id] = { score: 0, correct: 0, total: 0 };
          }
          participantAgg[row.participant_id].score += row.score;
          participantAgg[row.participant_id].correct += row.correct_answers;
          participantAgg[row.participant_id].total += row.total_questions;
        }

        // Build podium with participants
        const podiumTeams: PodiumTeam[] = [];
        for (const t of teams.filter(t => t.final_position && t.final_position <= 4)) {
          const participants = await getTrnParticipantsByTeam(t.id);
          const participantScores: ParticipantScore[] = participants
            .map(p => ({
              participant: p,
              totalScore: participantAgg[p.id]?.score ?? 0,
              totalCorrect: participantAgg[p.id]?.correct ?? 0,
              totalQuestions: participantAgg[p.id]?.total ?? 0,
            }))
            .sort((a, b) => b.totalScore - a.totalScore);

          podiumTeams.push({
            team: t,
            totalScore: teamScores[t.id] ?? 0,
            position: t.final_position!,
            participants: participantScores,
          });
        }

        podiumTeams.sort((a, b) => a.position - b.position);
        setPodium(podiumTeams);
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [tournamentId]);

  if (isLoading) return <div className="champ__loading">⏳ Cargando...</div>;
  if (!tournament) return <div className="champ__loading">❌ Torneo no encontrado</div>;
  if (podium.length === 0) return <div className="champ__loading">🏆 Aún no se ha declarado campeón</div>;

  const first = podium.find(p => p.position === 1);
  const second = podium.find(p => p.position === 2);
  const third = podium.find(p => p.position === 3);
  const fourth = podium.find(p => p.position === 4);

  return (
    <div className="champ">
      {/* Particles */}
      <div className="champ__particles">
        {Array.from({ length: 20 }).map((_, i) => (
          <motion.div
            key={i}
            className="champ__particle"
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: [0, 1, 0], y: [-20, -300] }}
            transition={{ duration: 2.5 + Math.random() * 2, repeat: Infinity, delay: Math.random() * 3 }}
            style={{ left: `${Math.random() * 100}%`, bottom: '0%' }}
          />
        ))}
      </div>

      <div className="champ__content">
        <button className="champ__back" onClick={() => navigate(`/tournament/${tournamentId}/bracket`)}>← Bracket</button>

        <motion.h1
          className="champ__title"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          🏆 {tournament.name}
        </motion.h1>
        <motion.p
          className="champ__subtitle"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          La batalla ha terminado. Solo los mejores se mantuvieron en pie.
        </motion.p>

        {/* Podium */}
        <div className="champ__podium">
          {second && (
            <motion.div className="champ__podium-slot champ__podium-slot--second" initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6, duration: 0.6 }}>
              <span className="champ__medal">🥈</span>
              <span className="champ__team-avatar">{second.team.avatar}</span>
              <h3 className="champ__team-name" style={{ color: second.team.color }}>{second.team.name}</h3>
              <span className="champ__team-score">{second.totalScore.toLocaleString()} pts</span>
              <div className="champ__podium-block champ__podium-block--second">2°</div>
            </motion.div>
          )}

          {first && (
            <motion.div className="champ__podium-slot champ__podium-slot--first" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.3, duration: 0.8, type: 'spring' }}>
              <span className="champ__crown">👑</span>
              <span className="champ__medal">🥇</span>
              <span className="champ__team-avatar champ__team-avatar--big">{first.team.avatar}</span>
              <h2 className="champ__team-name champ__team-name--champion" style={{ color: first.team.color }}>{first.team.name}</h2>
              <span className="champ__team-score champ__team-score--big">{first.totalScore.toLocaleString()} pts</span>
              <div className="champ__podium-block champ__podium-block--first">1°</div>
            </motion.div>
          )}

          {third && (
            <motion.div className="champ__podium-slot champ__podium-slot--third" initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.9, duration: 0.6 }}>
              <span className="champ__medal">🥉</span>
              <span className="champ__team-avatar">{third.team.avatar}</span>
              <h3 className="champ__team-name" style={{ color: third.team.color }}>{third.team.name}</h3>
              <span className="champ__team-score">{third.totalScore.toLocaleString()} pts</span>
              <div className="champ__podium-block champ__podium-block--third">3°</div>
            </motion.div>
          )}
        </div>

        {fourth && (
          <motion.div className="champ__fourth" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.2 }}>
            <span>4° lugar: {fourth.team.avatar} <strong style={{ color: fourth.team.color }}>{fourth.team.name}</strong> — {fourth.totalScore.toLocaleString()} pts</span>
          </motion.div>
        )}

        {/* Team breakdown */}
        <motion.div
          className="champ__breakdown"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.4 }}
        >
          <h3 className="champ__breakdown-title">⚡ Aportes por equipo</h3>
          <div className="champ__breakdown-grid">
            {podium.map(({ team, totalScore, position, participants }) => (
              <div key={team.id} className="champ__team-card" style={{ borderColor: team.color }}>
                <div className="champ__team-card-header">
                  <span className="champ__team-card-pos">
                    {position === 1 ? '🥇' : position === 2 ? '🥈' : position === 3 ? '🥉' : '4°'}
                  </span>
                  <span className="champ__team-card-avatar">{team.avatar}</span>
                  <div>
                    <h4 className="champ__team-card-name" style={{ color: team.color }}>{team.name}</h4>
                    <span className="champ__team-card-total">{totalScore.toLocaleString()} pts totales</span>
                  </div>
                </div>
                <div className="champ__team-card-participants">
                  {participants.map(({ participant, totalScore: pScore, totalCorrect, totalQuestions }) => (
                    <div key={participant.id} className="champ__participant-row">
                      <span className="champ__participant-info">
                        {participant.avatar} {participant.name}
                      </span>
                      <span className="champ__participant-score">{pScore.toLocaleString()}</span>
                      <span className="champ__participant-stats">
                        {totalCorrect}/{totalQuestions} ✅
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Actions */}
        <div className="champ__actions">
          <motion.button className="champ__btn" onClick={() => navigate(`/tournament/${tournamentId}/bracket`)} whileHover={{ scale: 1.05 }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.6 }}>
            🏆 Ver Bracket
          </motion.button>
          <motion.button className="champ__btn champ__btn--secondary" onClick={() => navigate(`/tournament/${tournamentId}/history`)} whileHover={{ scale: 1.05 }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.7 }}>
            📊 Seguimiento
          </motion.button>
        </div>
      </div>
    </div>
  );
}
