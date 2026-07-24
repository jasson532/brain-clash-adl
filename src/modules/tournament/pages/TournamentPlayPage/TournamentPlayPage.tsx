import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  getTournament,
  getTrnTeamsByTournament,
  getTrnParticipantsByTeam,
  updateTrnTeam,
  getRoundsByTournament,
  getMatchesByRound,
  saveMatchScore,
  upsertTrnLiveScore,
  getParticipantMatchGamesCount,
  checkAndAutoFinishMatch,
  createGameSession,
  updateGameSession,
  finishGameSession,
  getActiveGameSession,
} from 'modules/shared/services/supabase/tournament.service';
import { supabase } from 'modules/shared/services/supabase/supabaseClient';
import { getRandomQuestions, shuffleAnswers, calculatePoints } from 'modules/shared/services/questions.service';
import allQuestionsData from '../../../../data/questions.json';
import { useAnsweredQuestions } from 'modules/shared/hooks/useAnsweredQuestions';
import { useTimer } from 'modules/shared/hooks/useTimer';
import { useSound } from 'modules/shared/hooks/useSound';
import type { Tournament, TrnTeam, TrnParticipant, TrnMatch } from 'modules/shared/types/tournament.types';
import { TRN_TEAM_COLORS, TRN_TEAM_AVATARS } from 'modules/shared/types/tournament.types';
import type { LocalQuestion } from 'modules/shared/services/questions.service';
import Countdown from 'modules/shared/components/Countdown/Countdown';
import VSScreen from 'modules/shared/components/VSScreen/VSScreen';
import ConfettiExplosion from 'react-confetti-explosion';
import './TournamentPlayPage.css';

type PlayStep = 'find-player' | 'team-hub' | 'configure' | 'vs-screen' | 'countdown' | 'playing' | 'finished';

interface ParticipantWithTeam extends TrnParticipant {
  team: TrnTeam;
}

export default function TournamentPlayPage() {
  const { id: tournamentId } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [allParticipants, setAllParticipants] = useState<ParticipantWithTeam[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [step, setStep] = useState<PlayStep>('find-player');
  const [isLoading, setIsLoading] = useState(true);

  // Selected participant & team
  const [selectedParticipant, setSelectedParticipant] = useState<ParticipantWithTeam | null>(null);
  const [currentMatch, setCurrentMatch] = useState<TrnMatch | null>(null);
  const [gamesPlayed, setGamesPlayed] = useState(0);
  const [maxGames, setMaxGames] = useState(3);
  const [teamScore, setTeamScore] = useState(0);
  const [rivalScore, setRivalScore] = useState(0);
  const [rivalName, setRivalName] = useState('');
  const [rivalAvatar, setRivalAvatar] = useState('');
  const [rivalColor, setRivalColor] = useState('');
  const [roundMessage, setRoundMessage] = useState<string | null>(null);

  // Team editing
  const [editTeamName, setEditTeamName] = useState('');
  const [editTeamColor, setEditTeamColor] = useState('');
  const [editTeamAvatar, setEditTeamAvatar] = useState('');
  const [showEditTeam, setShowEditTeam] = useState(false);

  // Game config (simplified - no category selection)
  const [configDifficulty, setConfigDifficulty] = useState<string | null>(null);
  const [configQuestions, setConfigQuestions] = useState(10);
  const [configTime, setConfigTime] = useState(50);

  // Answered questions tracking (localStorage) - shared across all participants in this tournament
  const { answeredIds, markAnswered } = useAnsweredQuestions(tournamentId ?? null);

  // Game session persistence (DB-based for reliability)
  const [gameSessionId, setGameSessionId] = useState<string | null>(null);

  // Game state
  const [questions, setQuestions] = useState<LocalQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [correctAnswers, setCorrectAnswers] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [answers, setAnswers] = useState<string[]>([]);
  const [matchResult, setMatchResult] = useState<{ winnerId?: string; loserId?: string; teamAScore?: number; teamBScore?: number } | null>(null);

  const hasSavedRef = useRef(false);
  const { playCorrect, playWrong, playTick, playVictory } = useSound();
  const currentQuestion = questions[currentIndex] ?? null;
  const [showConfetti, setShowConfetti] = useState(false);
  const [skipVS, setSkipVS] = useState(false);

  const handleTimeUp = useCallback(() => {
    if (showResult) return;
    setShowResult(true);
    setStreak(0);
  }, [showResult]);

  const { timeRemaining, start, reset, percentage } = useTimer(configTime, handleTimeUp);

  // Load all tournament data
  useEffect(() => {
    if (!tournamentId) return;
    const load = async () => {
      try {
        const trn = await getTournament(tournamentId);
        setTournament(trn);
        setMaxGames(trn.max_games_per_participant);

        const teams = await getTrnTeamsByTournament(tournamentId);
        const participantsWithTeams: ParticipantWithTeam[] = [];

        for (const team of teams) {
          const participants = await getTrnParticipantsByTeam(team.id);
          for (const p of participants) {
            participantsWithTeams.push({ ...p, team });
          }
        }
        setAllParticipants(participantsWithTeams);
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [tournamentId]);

  // Check for existing game session in DB (page reload recovery)
  const sessionRecoveredRef = useRef(false);
  useEffect(() => {
    if (sessionRecoveredRef.current) return;
    if (!tournamentId || !allParticipants.length || !selectedParticipant || !currentMatch) return;

    const checkSession = async () => {
      console.log('[GameSession] Checking for active session...', { matchId: currentMatch.id, participantId: selectedParticipant.id });
      const session = await getActiveGameSession(currentMatch.id, selectedParticipant.id);
      console.log('[GameSession] Result:', session);

      if (!session) {
        console.log('[GameSession] No active session found - will start fresh');
        return;
      }

      sessionRecoveredRef.current = true;
      console.log('[GameSession] Recovering session - question', session.current_index + 1, 'of', session.total_questions, '- score:', session.score);

      // Recover: load the questions from the IDs stored in session
      const sessionQuestions = session.question_ids
        .map(id => (allQuestionsData as LocalQuestion[]).find(q => q.id === id))
        .filter(Boolean) as LocalQuestion[];

      if (sessionQuestions.length === 0) {
        console.log('[GameSession] Could not recover questions');
        return;
      }

      const idx = Math.min(session.current_index, sessionQuestions.length - 1);

      setGameSessionId(session.id);
      setQuestions(sessionQuestions);
      setCurrentIndex(idx);
      setScore(session.score);
      setCorrectAnswers(session.correct_answers);
      setStreak(session.streak);
      setBestStreak(session.best_streak);
      setConfigTime(session.config_time);
      setConfigQuestions(session.total_questions);
      setConfigDifficulty(session.config_difficulty);
      setAnswers(shuffleAnswers(sessionQuestions[idx]));
      setSelectedAnswer(null);
      setShowResult(false);
      setStep('playing');
      reset(session.config_time);
      setTimeout(() => start(), 300);
    };

    checkSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedParticipant, currentMatch]);

  // Find current active match for this participant's team
  const findCurrentMatch = useCallback(async (teamId: string): Promise<TrnMatch | null> => {
    if (!tournamentId) return null;
    const rounds = await getRoundsByTournament(tournamentId);
    const activeRound = rounds.find(r => r.status === 'in_progress');
    if (!activeRound) {
      // Check if there's a finished round waiting for next round to start
      const lastFinished = [...rounds].reverse().find(r => r.status === 'finished');
      const nextPending = rounds.find(r => r.status === 'pending');
      if (lastFinished && nextPending) {
        setRoundMessage(`✅ ${lastFinished.display_name} terminó. Espera a que se habilite ${nextPending.display_name}.`);
      } else if (rounds.every(r => r.status === 'finished')) {
        setRoundMessage('🏆 ¡El torneo ha finalizado!');
      }
      return null;
    }

    const matches = await getMatchesByRound(activeRound.id);
    const match = matches.find(m =>
      m.status === 'in_progress' && (m.team_a_id === teamId || m.team_b_id === teamId)
    );

    if (!match) {
      // Team's match in this round is already finished
      const teamMatch = matches.find(m => m.team_a_id === teamId || m.team_b_id === teamId);
      if (teamMatch?.status === 'finished') {
        const won = teamMatch.winner_id === teamId;
        setRoundMessage(won
          ? `🎉 ¡Tu equipo ganó su enfrentamiento en ${activeRound.display_name}! Espera la siguiente ronda.`
          : `😢 Tu equipo fue eliminado en ${activeRound.display_name}.`
        );
      }
    } else {
      setRoundMessage(null);
    }

    return match ?? null;
  }, [tournamentId]);

  // Load team + rival scores for the current match
  const loadMatchScores = useCallback(async (match: TrnMatch, teamId: string) => {
    // Finished games
    const { data: finishedData } = await supabase
      .from('trn_match_scores')
      .select('team_id, score')
      .eq('match_id', match.id);

    let myTotal = 0;
    let rivalTotal = 0;
    for (const row of finishedData ?? []) {
      if (row.team_id === teamId) myTotal += row.score;
      else rivalTotal += row.score;
    }

    // Add live scores (only from participants currently playing)
    const { data: liveData } = await supabase
      .from('trn_live_scores')
      .select('team_id, current_score')
      .eq('match_id', match.id)
      .eq('is_playing', true);

    for (const row of liveData ?? []) {
      if (row.team_id === teamId) myTotal += row.current_score;
      else rivalTotal += row.current_score;
    }

    setTeamScore(myTotal);
    setRivalScore(rivalTotal);

    // Get rival name
    const rivalId = match.team_a_id === teamId ? match.team_b_id : match.team_a_id;
    if (rivalId) {
      const { data: rivalData } = await supabase.from('trn_teams').select('name,avatar,color').eq('id', rivalId).single();
      setRivalName(rivalData?.name ?? 'Rival');
      setRivalAvatar(rivalData?.avatar ?? '❓');
      setRivalColor(rivalData?.color ?? '#ffffff');
    }
  }, []);

  // Subscribe to score changes for this match
  useEffect(() => {
    if (!currentMatch || !selectedParticipant) return;
    loadMatchScores(currentMatch, selectedParticipant.team.id);

    const channel = supabase
      .channel(`play-scores-${currentMatch.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'trn_match_scores', filter: `match_id=eq.${currentMatch.id}` },
        () => loadMatchScores(currentMatch, selectedParticipant.team.id),
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [currentMatch, selectedParticipant, loadMatchScores]);

  // When participant is selected, find their match
  const handleSelectParticipant = async (participant: ParticipantWithTeam) => {
    setSelectedParticipant(participant);
    setEditTeamName(participant.team.name);
    setEditTeamColor(participant.team.color);
    setEditTeamAvatar(participant.team.avatar);

    const match = await findCurrentMatch(participant.team.id);
    setCurrentMatch(match);

    // Check games played in this match
    if (match) {
      const count = await getParticipantMatchGamesCount(match.id, participant.id);
      setGamesPlayed(count);
    } else {
      setGamesPlayed(0);
    }

    setStep('team-hub');
  };

  // Save team edits
  const handleSaveTeam = async () => {
    if (!selectedParticipant || !editTeamName.trim()) return;
    await updateTrnTeam(selectedParticipant.team.id, {
      name: editTeamName.trim(),
      color: editTeamColor,
      avatar: editTeamAvatar,
    });
    // Update local state
    setSelectedParticipant({
      ...selectedParticipant,
      team: { ...selectedParticipant.team, name: editTeamName.trim(), color: editTeamColor, avatar: editTeamAvatar },
    });
    setShowEditTeam(false);
  };

  // Start playing - go to countdown first
  const startPlaying = async () => {
    if (!tournamentId || !selectedParticipant || !currentMatch) return;
    setIsLoading(true);
    try {
      // Get random questions excluding already answered ones
      const q = getRandomQuestions(configQuestions, answeredIds, configDifficulty);

      // Mark these questions as answered IMMEDIATELY (before playing)
      markAnswered(q.map(question => question.id));

      setQuestions(q);
      setCurrentIndex(0);
      setScore(0);
      setCorrectAnswers(0);
      setStreak(0);
      setBestStreak(0);
      setSelectedAnswer(null);
      setShowResult(false);
      setShowConfetti(false);
      setAnswers(shuffleAnswers(q[0]));

      // Go to VS screen first (or countdown if replay), then playing
      setStep(skipVS ? 'countdown' : 'vs-screen');
      setSkipVS(false);

      upsertTrnLiveScore({
        match_id: currentMatch.id,
        tournament_id: tournamentId,
        team_id: selectedParticipant.team.id,
        participant_id: selectedParticipant.id,
        participant_name: selectedParticipant.name,
        participant_avatar: selectedParticipant.avatar,
        current_score: 0,
        current_correct: 0,
        current_question: 1,
        total_questions: configQuestions,
        current_streak: 0,
        category_name: 'Mixta',
        is_playing: true,
      }).catch(console.error);

      // Persist session in DB for page reload recovery
      const sessionId = await createGameSession({
        tournament_id: tournamentId,
        match_id: currentMatch.id,
        team_id: selectedParticipant.team.id,
        participant_id: selectedParticipant.id,
        question_ids: q.map(question => question.id),
        total_questions: configQuestions,
        config_time: configTime,
        config_difficulty: configDifficulty,
      });
      setGameSessionId(sessionId);
      console.log('[GameSession] Created new session:', sessionId);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  // Called when countdown finishes
  const handleCountdownComplete = () => {
    // Force clean state right before playing starts
    setSelectedAnswer(null);
    setShowResult(false);
    setCurrentIndex(0);
    if (questions.length > 0) {
      setAnswers(shuffleAnswers(questions[0]));
    }
    setStep('playing');
    reset(configTime);
    setTimeout(() => start(), 200);
  };

  // Handle answer
  const handleAnswer = (answer: string) => {
    if (showResult || !currentQuestion || !currentMatch || !tournamentId || !selectedParticipant) return;
    const isCorrect = answer === currentQuestion.correct_answer;
    setSelectedAnswer(answer);
    setShowResult(true);

    let newScore = score;
    let newCorrect = correctAnswers;
    let newStreak = streak;

    if (isCorrect) {
      newStreak = streak + 1;
      const points = calculatePoints(currentQuestion.difficulty, timeRemaining, configTime, streak, configQuestions);
      newScore = score + points;
      newCorrect = correctAnswers + 1;
      setScore(newScore);
      setCorrectAnswers(newCorrect);
      setStreak(newStreak);
      if (newStreak > bestStreak) setBestStreak(newStreak);
      playCorrect();

      // Confetti on streak of 5
      if (newStreak % 5 === 0) {
        setShowConfetti(true);
        setTimeout(() => setShowConfetti(false), 2000);
      }
    } else {
      newStreak = 0;
      setStreak(0);
      playWrong();
    }

    upsertTrnLiveScore({
      match_id: currentMatch.id,
      tournament_id: tournamentId,
      team_id: selectedParticipant.team.id,
      participant_id: selectedParticipant.id,
      participant_name: selectedParticipant.name,
      participant_avatar: selectedParticipant.avatar,
      current_score: newScore,
      current_correct: newCorrect,
      current_question: currentIndex + 1,
      total_questions: questions.length,
      current_streak: newStreak,
      is_playing: true,
    }).catch(console.error);

    // Persist progress to DB for recovery
    if (gameSessionId) {
      updateGameSession(gameSessionId, {
        current_index: currentIndex,
        score: newScore,
        correct_answers: newCorrect,
        streak: newStreak,
        best_streak: Math.max(bestStreak, newStreak),
      }).catch(console.error);
    }
  };

  // Next question
  const handleNext = () => {
    const nextIdx = currentIndex + 1;
    if (nextIdx >= questions.length) {
      setStep('finished');
      return;
    }
    setCurrentIndex(nextIdx);
    setSelectedAnswer(null);
    setShowResult(false);
    setAnswers(shuffleAnswers(questions[nextIdx]));
    reset(configTime);
    setTimeout(() => start(), 100);

    // Persist the new question index to DB
    if (gameSessionId) {
      updateGameSession(gameSessionId, {
        current_index: nextIdx,
        score,
        correct_answers: correctAnswers,
        streak,
        best_streak: bestStreak,
      }).catch(console.error);
    }
  };

  // Save score on finish
  useEffect(() => {
    if (step !== 'finished') { hasSavedRef.current = false; return; }
    if (hasSavedRef.current) return;
    if (!currentMatch || !tournamentId || !selectedParticipant) return;

    hasSavedRef.current = true;
    playVictory();

    // Mark game session as finished in DB
    if (gameSessionId) {
      finishGameSession(gameSessionId).catch(console.error);
    }

    upsertTrnLiveScore({
      match_id: currentMatch.id,
      tournament_id: tournamentId,
      team_id: selectedParticipant.team.id,
      participant_id: selectedParticipant.id,
      participant_name: selectedParticipant.name,
      participant_avatar: selectedParticipant.avatar,
      current_score: score,
      current_correct: correctAnswers,
      current_question: questions.length,
      total_questions: questions.length,
      current_streak: 0,
      is_playing: false,
    }).catch(console.error);

    saveMatchScore({
      match_id: currentMatch.id,
      tournament_id: tournamentId,
      team_id: selectedParticipant.team.id,
      participant_id: selectedParticipant.id,
      score,
      correct_answers: correctAnswers,
      total_questions: questions.length,
      best_streak: bestStreak,
    }).then(async () => {
      setGamesPlayed(prev => prev + 1);
      // Check if all participants finished all their games → auto-finish match
      try {
        const result = await checkAndAutoFinishMatch(currentMatch.id, tournamentId);
        if (result.finished) {
          setMatchResult(result);
        }
      } catch (err) {
        console.error('Auto-finish check error:', err);
      }
    }).catch(console.error);
  }, [step, currentMatch, tournamentId, selectedParticipant, score, correctAnswers, questions.length, bestStreak, playVictory]);

  // Tick sound
  useEffect(() => {
    if (timeRemaining <= 5 && timeRemaining > 0 && !showResult && step === 'playing') playTick();
  }, [timeRemaining, showResult, step, playTick]);

  const getTimerColor = () => {
    if (percentage > 60) return 'var(--success)';
    if (percentage > 30) return 'var(--warning)';
    return 'var(--danger)';
  };

  const getAnswerClass = (answer: string) => {
    if (!showResult) return '';
    if (answer === currentQuestion?.correct_answer) return 'trnplay__answer--correct';
    if (answer === selectedAnswer && answer !== currentQuestion?.correct_answer) return 'trnplay__answer--wrong';
    return 'trnplay__answer--dimmed';
  };

  // ============ RENDER ============

  if (isLoading && !tournament) return <div className="trnplay__loading">⏳ Cargando torneo...</div>;

  // VS SCREEN
  if (step === 'vs-screen' && selectedParticipant) {
    return (
      <VSScreen
        teamAName={selectedParticipant.team.name}
        teamAAvatar={selectedParticipant.team.avatar}
        teamAColor={selectedParticipant.team.color}
        teamBName={rivalName || 'Rival'}
        teamBAvatar={rivalAvatar || '❓'}
        teamBColor={rivalColor || '#ffffff'}
        onComplete={() => setStep('countdown')}
      />
    );
  }

  // COUNTDOWN
  if (step === 'countdown') {
    return <Countdown onComplete={handleCountdownComplete} />;
  }

  // Filtered participants
  const filteredParticipants = searchQuery.trim()
    ? allParticipants.filter(p =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.team.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : allParticipants;

  // STEP 1: Find player
  if (step === 'find-player') {
    return (
      <div className="trnplay">
        <button className="trnplay__back" onClick={() => navigate(`/tournament/${tournamentId}`)}>← Torneo</button>
        <div className="trnplay__select-card">
          <h2 className="trnplay__select-title">👋 ¿Quién eres?</h2>
          <p className="trnplay__hint">Selecciona tu nombre para entrar a la competencia</p>

          <input
            className="trnplay__search-input"
            type="text"
            placeholder="🔍 Buscar por nombre o equipo..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            autoFocus
          />

          <div className="trnplay__participants-list">
            {filteredParticipants.map((p) => (
              <motion.button
                key={p.id}
                className="trnplay__participant-option"
                onClick={() => handleSelectParticipant(p)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <span className="trnplay__p-avatar">{p.avatar}</span>
                <div className="trnplay__p-info">
                  <span className="trnplay__p-name">{p.name}</span>
                  <span className="trnplay__p-team" style={{ color: p.team.color }}>
                    {p.team.avatar} {p.team.name}
                  </span>
                </div>
              </motion.button>
            ))}
            {filteredParticipants.length === 0 && (
              <p className="trnplay__no-results">No se encontraron participantes</p>
            )}
          </div>
        </div>
      </div>
    );
  }

  // STEP 2: Team hub (see team, edit team, start game)
  if (step === 'team-hub' && selectedParticipant) {
    const canEditTeam = tournament?.status === 'in_progress';
    const canPlay = currentMatch !== null && tournament?.status === 'in_progress' && gamesPlayed < maxGames;
    const gamesRemaining = maxGames - gamesPlayed;

    return (
      <div className="trnplay">
        <button className="trnplay__back" onClick={() => { setStep('find-player'); setSelectedParticipant(null); }}>← Cambiar jugador</button>
        <div className="trnplay__select-card">
          <div className="trnplay__team-display" style={{ borderColor: selectedParticipant.team.color }}>
            <span className="trnplay__team-big-avatar">{selectedParticipant.team.avatar}</span>
            <h2 className="trnplay__team-big-name" style={{ color: selectedParticipant.team.color }}>
              {selectedParticipant.team.name}
            </h2>
            <p className="trnplay__player-greeting">Hola, {selectedParticipant.avatar} {selectedParticipant.name}</p>
            {currentMatch && (
              <div className="trnplay__games-badge">
                {gamesRemaining > 0 ? (
                  <>
                    <span className="trnplay__games-badge-icon">🎮</span>
                    <span className="trnplay__games-badge-count">{gamesRemaining}</span>
                    <span className="trnplay__games-badge-text">partida{gamesRemaining > 1 ? 's' : ''} disponible{gamesRemaining > 1 ? 's' : ''}</span>
                  </>
                ) : (
                  <>
                    <span className="trnplay__games-badge-icon">🚫</span>
                    <span className="trnplay__games-badge-text">Sin partidas restantes</span>
                  </>
                )}
              </div>
            )}
            {currentMatch && (
              <div className="trnplay__score-panel">
                <div className="trnplay__score-team trnplay__score-team--mine">
                  <span className="trnplay__score-team-avatar">{selectedParticipant.team.avatar}</span>
                  <span className="trnplay__score-label" style={{ color: selectedParticipant.team.color }}>{selectedParticipant.team.name}</span>
                  <span className="trnplay__score-value">{teamScore}</span>
                </div>
                <span className="trnplay__score-vs">⚡</span>
                <div className="trnplay__score-team trnplay__score-team--rival">
                  <span className="trnplay__score-team-avatar">{rivalAvatar || '❓'}</span>
                  <span className="trnplay__score-label" style={{ color: rivalColor }}>{rivalName || 'Rival'}</span>
                  <span className="trnplay__score-value">{rivalScore}</span>
                </div>
              </div>
            )}
            {canEditTeam && (
              <button className="trnplay__edit-team-btn" onClick={() => setShowEditTeam(!showEditTeam)}>
                ✏️ Editar equipo
              </button>
            )}
          </div>

          {/* Edit team form */}
          {showEditTeam && canEditTeam && (
            <div className="trnplay__edit-team-form">
              <div className="trnplay__field">
                <label>Nombre del equipo</label>
                <input type="text" value={editTeamName} onChange={(e) => setEditTeamName(e.target.value)} />
              </div>
              <div className="trnplay__field">
                <label>Color</label>
                <div className="trnplay__color-grid">
                  {TRN_TEAM_COLORS.map(c => (
                    <button key={c} className={`trnplay__color-btn ${editTeamColor === c ? 'trnplay__color-btn--active' : ''}`} style={{ background: c }} onClick={() => setEditTeamColor(c)} />
                  ))}
                </div>
              </div>
              <div className="trnplay__field">
                <label>Icono</label>
                <div className="trnplay__avatar-grid">
                  {TRN_TEAM_AVATARS.map(a => (
                    <button key={a} className={`trnplay__avatar-btn ${editTeamAvatar === a ? 'trnplay__avatar-btn--active' : ''}`} onClick={() => setEditTeamAvatar(a)}>{a}</button>
                  ))}
                </div>
              </div>
              <button className="trnplay__save-team-btn" onClick={handleSaveTeam} disabled={!editTeamName.trim()}>
                💾 Guardar cambios
              </button>
            </div>
          )}

          {/* Play button */}
          {canPlay ? (
            <motion.button
              className="trnplay__start-btn"
              onClick={() => setStep('configure')}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              🎮 ¡Jugar!
            </motion.button>
          ) : currentMatch && gamesPlayed >= maxGames ? (
            <div className="trnplay__no-match">
              <p>🚫 Ya completaste tus {maxGames} juego{maxGames > 1 ? 's' : ''} en esta ronda. ¡Espera a tus compañeros!</p>
            </div>
          ) : (
            <div className="trnplay__no-match">
              {roundMessage ? (
                <p>{roundMessage}</p>
              ) : tournament?.status === 'paused' ? (
                <p>⏸️ El torneo está pausado. Espera a que se reanude para jugar.</p>
              ) : !currentMatch ? (
                <p>⏳ No hay un enfrentamiento activo para tu equipo en este momento.</p>
              ) : (
                <p>El torneo no está en curso.</p>
              )}
            </div>
          )}

          <motion.button
            className="trnplay__bracket-link"
            onClick={() => navigate(`/tournament/${tournamentId}/bracket`)}
            whileHover={{ scale: 1.03 }}
          >
            🏆 Ver Bracket
          </motion.button>
        </div>
      </div>
    );
  }

  // STEP 3: Configure game
  if (step === 'configure') {
    return (
      <div className="trnplay">
        <button className="trnplay__back" onClick={() => setStep('team-hub')}>← Mi equipo</button>
        <div className="trnplay__select-card">
          <h2 className="trnplay__select-title">⚙️ Configura tu partida</h2>
          <p className="trnplay__config-hint">Las preguntas serán aleatorias de todas las categorías</p>

          <div className="trnplay__config-field">
            <label>Dificultad</label>
            <div className="trnplay__difficulty-options">
              <button className={`trnplay__diff-btn ${configDifficulty === null ? 'trnplay__diff-btn--active' : ''}`} onClick={() => setConfigDifficulty(null)}>🎲 Mixta</button>
              <button className={`trnplay__diff-btn ${configDifficulty === 'easy' ? 'trnplay__diff-btn--active' : ''}`} onClick={() => setConfigDifficulty('easy')} style={configDifficulty === 'easy' ? { borderColor: '#00ff88' } : {}}>🟢 Fácil<br/><small>100 pts</small></button>
              <button className={`trnplay__diff-btn ${configDifficulty === 'medium' ? 'trnplay__diff-btn--active' : ''}`} onClick={() => setConfigDifficulty('medium')} style={configDifficulty === 'medium' ? { borderColor: '#ffaa00' } : {}}>🟡 Media<br/><small>200 pts</small></button>
              <button className={`trnplay__diff-btn ${configDifficulty === 'hard' ? 'trnplay__diff-btn--active' : ''}`} onClick={() => setConfigDifficulty('hard')} style={configDifficulty === 'hard' ? { borderColor: '#ff4466' } : {}}>🔴 Difícil<br/><small>300 pts</small></button>
            </div>
          </div>

          <div className="trnplay__config-field">
            <label>Preguntas: <strong>{configQuestions}</strong> <span className="trnplay__config-hint-inline">{configQuestions === 10 ? '(máx puntos)' : configQuestions >= 18 ? '(mín puntos)' : ''}</span></label>
            <input type="range" min={10} max={20} step={1} value={configQuestions} onChange={(e) => setConfigQuestions(Number(e.target.value))} />
          </div>

          <div className="trnplay__config-field">
            <label>Tiempo por pregunta: <strong>{configTime}s</strong> <span className="trnplay__config-hint-inline">{configTime <= 25 ? '(máx puntos)' : configTime >= 45 ? '(mín puntos)' : ''}</span></label>
            <input type="range" min={20} max={50} step={5} value={configTime} onChange={(e) => setConfigTime(Number(e.target.value))} />
          </div>

          <motion.button className="trnplay__start-btn" onClick={startPlaying} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} disabled={isLoading}>
            {isLoading ? '⏳ Cargando...' : '🚀 ¡Iniciar!'}
          </motion.button>
        </div>
      </div>
    );
  }

  // STEP 4: Playing
  if (step === 'playing' && currentQuestion) {
    return (
      <div className="trnplay">
        {showConfetti && <ConfettiExplosion force={0.6} duration={2500} particleCount={80} />}

        {/* Match info bar */}
        <div className="trnplay__match-bar">
          <div className="trnplay__match-bar-team">
            <span>{selectedParticipant?.team.avatar}</span>
            <span className="trnplay__match-bar-score" style={{ color: selectedParticipant?.team.color }}>{teamScore}</span>
          </div>
          <span className="trnplay__match-bar-vs">⚡</span>
          <div className="trnplay__match-bar-team">
            <span className="trnplay__match-bar-score" style={{ color: rivalColor }}>{rivalScore}</span>
            <span>{rivalAvatar || '❓'}</span>
          </div>
        </div>

        <div className="trnplay__game-header">
          <span className="trnplay__question-counter">Pregunta <strong>{currentIndex + 1}</strong> / {questions.length}</span>
          <span className="trnplay__score-display">⭐ {score}</span>
          {streak > 1 && <span className="trnplay__streak">🔥 x{streak}</span>}
        </div>

        <div className="trnplay__timer">
          <div className="trnplay__timer-bar" style={{ width: `${percentage}%`, background: getTimerColor() }} />
          <span className="trnplay__timer-text" style={{ color: getTimerColor() }}>{timeRemaining}s</span>
        </div>

        <div className="trnplay__question-card">
          <span className="trnplay__category-badge">{currentQuestion.category}</span>
          <h2 className="trnplay__question-text">{currentQuestion.question}</h2>
        </div>

        <div className="trnplay__answers">
          {answers.map((answer, idx) => (
            <motion.button
              key={idx}
              className={`trnplay__answer ${getAnswerClass(answer)}`}
              onClick={() => handleAnswer(answer)}
              disabled={showResult}
              whileHover={!showResult ? { scale: 1.02 } : {}}
              whileTap={!showResult ? { scale: 0.98 } : {}}
            >
              {answer}
            </motion.button>
          ))}
        </div>

        {showResult && (
          <motion.button className="trnplay__next-btn" onClick={handleNext} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} whileHover={{ scale: 1.05 }}>
            {currentIndex + 1 >= questions.length ? '🏁 Ver resultados' : 'Siguiente →'}
          </motion.button>
        )}
      </div>
    );
  }

  // STEP 5: Finished
  if (step === 'finished') {
    const accuracyPct = questions.length > 0 ? Math.round((correctAnswers / questions.length) * 100) : 0;
    const myTeamWon = matchResult?.winnerId === selectedParticipant?.team.id;
    const myTeamLost = matchResult?.loserId === selectedParticipant?.team.id;

    return (
      <div className="trnplay">
        <div className="trnplay__finished-card">
          <h2 className="trnplay__finished-title">🏁 ¡Partida Terminada!</h2>
          <div className="trnplay__finished-stats">
            <div className="trnplay__stat"><span className="trnplay__stat-value">{score}</span><span className="trnplay__stat-label">Puntos</span></div>
            <div className="trnplay__stat"><span className="trnplay__stat-value">{correctAnswers}/{questions.length}</span><span className="trnplay__stat-label">Correctas</span></div>
            <div className="trnplay__stat"><span className="trnplay__stat-value">{accuracyPct}%</span><span className="trnplay__stat-label">Precisión</span></div>
            <div className="trnplay__stat"><span className="trnplay__stat-value">🔥 {bestStreak}</span><span className="trnplay__stat-label">Mejor racha</span></div>
          </div>

          {/* Match result banner */}
          {matchResult && (
            <div className={`trnplay__match-result ${myTeamWon ? 'trnplay__match-result--win' : 'trnplay__match-result--lose'}`}>
              <h3>{myTeamWon ? '🎉 ¡Tu equipo ganó el enfrentamiento!' : myTeamLost ? '😢 Tu equipo fue eliminado' : '🏁 Enfrentamiento terminado'}</h3>
              <p className="trnplay__match-result-score">
                {matchResult.teamAScore ?? 0} - {matchResult.teamBScore ?? 0}
              </p>
            </div>
          )}

          <div className="trnplay__finished-actions">
            <motion.button className="trnplay__back-btn" onClick={() => { setStep('team-hub'); hasSavedRef.current = false; setMatchResult(null); }} whileHover={{ scale: 1.05 }}>
              🏠 Mi Equipo
            </motion.button>
            {!matchResult && gamesPlayed < maxGames && (
              <motion.button className="trnplay__replay-btn" onClick={() => { setSkipVS(true); setStep('configure'); hasSavedRef.current = false; setSelectedAnswer(null); setShowResult(false); }} whileHover={{ scale: 1.05 }}>
                🔄 Jugar otra vez
              </motion.button>
            )}
            <motion.button className="trnplay__replay-btn" onClick={() => navigate(`/tournament/${tournamentId}/bracket`)} whileHover={{ scale: 1.05 }}>
              🏆 Ver Bracket
            </motion.button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
