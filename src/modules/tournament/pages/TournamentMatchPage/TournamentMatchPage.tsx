import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  getTournament,
  getTrnParticipantsByTeam,
  saveMatchScore,
  upsertTrnLiveScore,
  subscribeToTrnLiveScores,
  getTrnLiveScoresByMatch,
} from 'modules/shared/services/supabase/tournament.service';
import { supabase } from 'modules/shared/services/supabase/supabaseClient';
import { fetchTriviaQuestions, shuffleAnswers, calculatePoints } from 'modules/shared/services/trivia.service';
import { useTimer } from 'modules/shared/hooks/useTimer';
import { useSound } from 'modules/shared/hooks/useSound';
import type { Tournament, TrnMatch, TrnParticipant, TrnLiveScore } from 'modules/shared/types/tournament.types';
import type { TriviaQuestion } from 'modules/shared/types/game.types';
import { TRIVIA_CATEGORIES, DIFFICULTY_CONFIG } from 'modules/shared/types/game.types';
import './TournamentMatchPage.css';

type PlayStep = 'select-team' | 'select-player' | 'configure' | 'playing' | 'finished';

export default function TournamentMatchPage() {
  const { id: tournamentId, matchId } = useParams<{ id: string; matchId: string }>();
  const navigate = useNavigate();

  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [match, setMatch] = useState<TrnMatch | null>(null);
  const [teamAName, setTeamAName] = useState('');
  const [teamBName, setTeamBName] = useState('');
  const [teamAColor, setTeamAColor] = useState('');
  const [teamBColor, setTeamBColor] = useState('');
  const [participants, setParticipants] = useState<TrnParticipant[]>([]);
  const [liveScores, setLiveScores] = useState<TrnLiveScore[]>([]);
  const [step, setStep] = useState<PlayStep>('select-team');

  // Selection
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [selectedParticipant, setSelectedParticipant] = useState<TrnParticipant | null>(null);

  // Game config
  const [configCategory, setConfigCategory] = useState<number | null>(null);
  const [configDifficulty, setConfigDifficulty] = useState<string | null>(null);
  const [configQuestions, setConfigQuestions] = useState(10);
  const [configTime, setConfigTime] = useState(20);

  // Game state
  const [questions, setQuestions] = useState<TriviaQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [correctAnswers, setCorrectAnswers] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [answers, setAnswers] = useState<string[]>([]);

  const hasSavedRef = useRef(false);
  const { playCorrect, playWrong, playTick, playVictory } = useSound();
  const currentQuestion = questions[currentIndex] ?? null;

  const handleTimeUp = useCallback(() => {
    if (showResult) return;
    setShowResult(true);
    setStreak(0);
  }, [showResult]);

  const { timeRemaining, start, reset, percentage } = useTimer(configTime, handleTimeUp);

  // Load match data
  useEffect(() => {
    if (!tournamentId || !matchId) return;
    const load = async () => {
      try {
        const trn = await getTournament(tournamentId);
        setTournament(trn);

        const { data: matchData } = await supabase
          .from('trn_matches')
          .select('*')
          .eq('id', matchId)
          .single();
        setMatch(matchData as TrnMatch);

        // Get team names
        if (matchData?.team_a_id) {
          const { data: tA } = await supabase.from('trn_teams').select('name,color').eq('id', matchData.team_a_id).single();
          setTeamAName(tA?.name ?? '');
          setTeamAColor(tA?.color ?? '#00f5ff');
        }
        if (matchData?.team_b_id) {
          const { data: tB } = await supabase.from('trn_teams').select('name,color').eq('id', matchData.team_b_id).single();
          setTeamBName(tB?.name ?? '');
          setTeamBColor(tB?.color ?? '#bf00ff');
        }

        // Load live scores
        const live = await getTrnLiveScoresByMatch(matchId);
        setLiveScores(live as TrnLiveScore[]);
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [tournamentId, matchId]);

  // Real-time live scores
  useEffect(() => {
    if (!matchId) return;
    const unsub = subscribeToTrnLiveScores(matchId, async () => {
      const live = await getTrnLiveScoresByMatch(matchId);
      setLiveScores(live as TrnLiveScore[]);
    });
    return unsub;
  }, [matchId]);

  // Load participants when team selected
  useEffect(() => {
    if (!selectedTeamId) return;
    getTrnParticipantsByTeam(selectedTeamId).then(setParticipants);
  }, [selectedTeamId]);

  // Start playing
  const startPlaying = async () => {
    if (!tournamentId || !matchId || !selectedTeamId || !selectedParticipant) return;
    setIsLoading(true);
    try {
      const q = await fetchTriviaQuestions(configQuestions, configCategory, configDifficulty);
      setQuestions(q);
      setAnswers(shuffleAnswers(q[0]));
      setCurrentIndex(0);
      setScore(0);
      setCorrectAnswers(0);
      setStreak(0);
      setBestStreak(0);
      setStep('playing');
      reset(configTime);
      setTimeout(() => start(), 100);

      const categoryName = configCategory
        ? TRIVIA_CATEGORIES.find((c) => c.id === configCategory)?.name ?? 'Mixta'
        : 'Todas las categorías';

      upsertTrnLiveScore({
        match_id: matchId,
        tournament_id: tournamentId,
        team_id: selectedTeamId,
        participant_id: selectedParticipant.id,
        participant_name: selectedParticipant.name,
        participant_avatar: selectedParticipant.avatar,
        current_score: 0,
        current_correct: 0,
        current_question: 1,
        total_questions: configQuestions,
        current_streak: 0,
        category_name: categoryName,
        is_playing: true,
      }).catch(console.error);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle answer
  const handleAnswer = (answer: string) => {
    if (showResult || !currentQuestion || !matchId || !tournamentId || !selectedTeamId || !selectedParticipant) return;
    const isCorrect = answer === currentQuestion.correct_answer;

    setSelectedAnswer(answer);
    setShowResult(true);

    let newScore = score;
    let newCorrect = correctAnswers;
    let newStreak = streak;

    if (isCorrect) {
      newStreak = streak + 1;
      const points = calculatePoints(currentQuestion.difficulty, timeRemaining, configTime, streak);
      newScore = score + points;
      newCorrect = correctAnswers + 1;
      setScore(newScore);
      setCorrectAnswers(newCorrect);
      setStreak(newStreak);
      if (newStreak > bestStreak) setBestStreak(newStreak);
      playCorrect();
    } else {
      newStreak = 0;
      setStreak(0);
      playWrong();
    }

    upsertTrnLiveScore({
      match_id: matchId,
      tournament_id: tournamentId,
      team_id: selectedTeamId,
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
  };

  // Save score on finish
  useEffect(() => {
    if (step !== 'finished') { hasSavedRef.current = false; return; }
    if (hasSavedRef.current) return;
    if (!matchId || !tournamentId || !selectedTeamId || !selectedParticipant) return;

    hasSavedRef.current = true;
    playVictory();

    // Mark live score as not playing
    upsertTrnLiveScore({
      match_id: matchId,
      tournament_id: tournamentId,
      team_id: selectedTeamId,
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

    // Save final score
    saveMatchScore({
      match_id: matchId,
      tournament_id: tournamentId,
      team_id: selectedTeamId,
      participant_id: selectedParticipant.id,
      score,
      correct_answers: correctAnswers,
      total_questions: questions.length,
      best_streak: bestStreak,
    }).catch(console.error);
  }, [step, matchId, tournamentId, selectedTeamId, selectedParticipant, score, correctAnswers, questions.length, bestStreak, playVictory]);

  // Tick sound
  useEffect(() => {
    if (timeRemaining <= 5 && timeRemaining > 0 && !showResult && step === 'playing') {
      playTick();
    }
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

  if (isLoading) return <div className="trnplay__loading">⏳ Cargando match...</div>;
  if (!tournament || !match) return <div className="trnplay__loading">❌ Match no encontrado</div>;

  // Step 1: Select team
  if (step === 'select-team') {
    return (
      <div className="trnplay">
        <button className="trnplay__back" onClick={() => navigate(`/tournament/${tournamentId}/bracket`)}>← Bracket</button>
        <div className="trnplay__select-card">
          <h2 className="trnplay__select-title">⚔️ ¿De qué equipo eres?</h2>
          <div className="trnplay__teams-list">
            {match.team_a_id && (
              <motion.button
                className="trnplay__team-option"
                style={{ borderColor: teamAColor }}
                onClick={() => { setSelectedTeamId(match.team_a_id!); setStep('select-player'); }}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
              >
                <span style={{ color: teamAColor, fontWeight: 700 }}>{teamAName}</span>
              </motion.button>
            )}
            {match.team_b_id && (
              <motion.button
                className="trnplay__team-option"
                style={{ borderColor: teamBColor }}
                onClick={() => { setSelectedTeamId(match.team_b_id!); setStep('select-player'); }}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
              >
                <span style={{ color: teamBColor, fontWeight: 700 }}>{teamBName}</span>
              </motion.button>
            )}
          </div>

          {/* Live scoreboard */}
          {liveScores.length > 0 && (
            <div className="trnplay__live-panel">
              <h3 className="trnplay__live-title">📊 Marcador en vivo</h3>
              {liveScores.map((ls) => (
                <div key={ls.id} className="trnplay__live-row">
                  <span>{ls.participant_avatar} {ls.participant_name}</span>
                  <span className="trnplay__live-score">{ls.current_score} pts</span>
                  <span className={`trnplay__live-status ${ls.is_playing ? 'trnplay__live-status--playing' : ''}`}>
                    {ls.is_playing ? '🟢' : '✅'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Step 2: Select player
  if (step === 'select-player') {
    return (
      <div className="trnplay">
        <button className="trnplay__back" onClick={() => { setStep('select-team'); setSelectedTeamId(null); }}>← Cambiar equipo</button>
        <div className="trnplay__select-card">
          <h2 className="trnplay__select-title">👤 ¿Quién eres?</h2>
          <div className="trnplay__participants-list">
            {participants.map((p) => (
              <motion.button
                key={p.id}
                className={`trnplay__participant-option ${selectedParticipant?.id === p.id ? 'trnplay__participant-option--selected' : ''}`}
                onClick={() => setSelectedParticipant(p)}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
              >
                <span>{p.avatar}</span>
                <span>{p.name}</span>
              </motion.button>
            ))}
          </div>
          {selectedParticipant && (
            <motion.button
              className="trnplay__start-btn"
              onClick={() => setStep('configure')}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              Continuar →
            </motion.button>
          )}
        </div>
      </div>
    );
  }

  // Step 3: Configure
  if (step === 'configure') {
    return (
      <div className="trnplay">
        <button className="trnplay__back" onClick={() => setStep('select-player')}>← Atrás</button>
        <div className="trnplay__select-card">
          <h2 className="trnplay__select-title">⚙️ Configura la partida</h2>
          <p className="trnplay__config-hint">Decidan como equipo cómo quieren jugar</p>

          <div className="trnplay__config-field">
            <label>Categoría</label>
            <select value={configCategory ?? ''} onChange={(e) => setConfigCategory(e.target.value ? Number(e.target.value) : null)}>
              <option value="">🎲 Todas</option>
              {TRIVIA_CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          <div className="trnplay__config-field">
            <label>Dificultad</label>
            <div className="trnplay__difficulty-options">
              <button className={`trnplay__diff-btn ${configDifficulty === null ? 'trnplay__diff-btn--active' : ''}`} onClick={() => setConfigDifficulty(null)}>🎲 Mixta</button>
              {Object.entries(DIFFICULTY_CONFIG).map(([key, val]) => (
                <button key={key} className={`trnplay__diff-btn ${configDifficulty === key ? 'trnplay__diff-btn--active' : ''}`} onClick={() => setConfigDifficulty(key)} style={configDifficulty === key ? { borderColor: val.color } : {}}>
                  {val.label}
                </button>
              ))}
            </div>
          </div>

          <div className="trnplay__config-field">
            <label>Preguntas: <strong>{configQuestions}</strong></label>
            <input type="range" min={5} max={20} step={1} value={configQuestions} onChange={(e) => setConfigQuestions(Number(e.target.value))} />
          </div>

          <div className="trnplay__config-field">
            <label>Tiempo por pregunta: <strong>{configTime}s</strong></label>
            <input type="range" min={10} max={120} step={5} value={configTime} onChange={(e) => setConfigTime(Number(e.target.value))} />
          </div>

          <motion.button className="trnplay__start-btn" onClick={startPlaying} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} disabled={isLoading}>
            {isLoading ? '⏳ Cargando preguntas...' : '🎮 ¡Iniciar!'}
          </motion.button>
        </div>
      </div>
    );
  }

  // Step 4: Playing
  if (step === 'playing' && currentQuestion) {
    return (
      <div className="trnplay">
        <div className="trnplay__game-header">
          <span className="trnplay__question-counter">Pregunta {currentIndex + 1}/{questions.length}</span>
          <span className="trnplay__score-display">⭐ {score}</span>
          {streak > 1 && <span className="trnplay__streak">🔥 x{streak}</span>}
        </div>

        {/* Timer */}
        <div className="trnplay__timer">
          <div className="trnplay__timer-bar" style={{ width: `${percentage}%`, background: getTimerColor() }} />
          <span className="trnplay__timer-text" style={{ color: getTimerColor() }}>{timeRemaining}s</span>
        </div>

        {/* Question */}
        <div className="trnplay__question-card">
          <span className="trnplay__category-badge">{currentQuestion.category}</span>
          <h2 className="trnplay__question-text">{currentQuestion.question}</h2>
        </div>

        {/* Answers */}
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

        {/* Next button */}
        {showResult && (
          <motion.button
            className="trnplay__next-btn"
            onClick={handleNext}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ scale: 1.05 }}
          >
            {currentIndex + 1 >= questions.length ? '🏁 Ver resultados' : 'Siguiente →'}
          </motion.button>
        )}
      </div>
    );
  }

  // Step 5: Finished
  if (step === 'finished') {
    const accuracyPct = questions.length > 0 ? Math.round((correctAnswers / questions.length) * 100) : 0;
    return (
      <div className="trnplay">
        <div className="trnplay__finished-card">
          <h2 className="trnplay__finished-title">🏁 ¡Partida Terminada!</h2>
          <div className="trnplay__finished-stats">
            <div className="trnplay__stat">
              <span className="trnplay__stat-value">{score}</span>
              <span className="trnplay__stat-label">Puntos</span>
            </div>
            <div className="trnplay__stat">
              <span className="trnplay__stat-value">{correctAnswers}/{questions.length}</span>
              <span className="trnplay__stat-label">Correctas</span>
            </div>
            <div className="trnplay__stat">
              <span className="trnplay__stat-value">{accuracyPct}%</span>
              <span className="trnplay__stat-label">Precisión</span>
            </div>
            <div className="trnplay__stat">
              <span className="trnplay__stat-value">🔥 {bestStreak}</span>
              <span className="trnplay__stat-label">Mejor racha</span>
            </div>
          </div>
          <div className="trnplay__finished-actions">
            <motion.button className="trnplay__back-btn" onClick={() => navigate(`/tournament/${tournamentId}/bracket`)} whileHover={{ scale: 1.05 }}>
              🏆 Volver al Bracket
            </motion.button>
            <motion.button className="trnplay__replay-btn" onClick={() => { setStep('configure'); hasSavedRef.current = false; }} whileHover={{ scale: 1.05 }}>
              🔄 Jugar otra vez
            </motion.button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
