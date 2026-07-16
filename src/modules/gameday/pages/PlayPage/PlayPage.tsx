import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  getGameday,
  getTeamsByGameday,
  getParticipantsByTeam,
  getParticipantGamesCount,
  createGame,
  saveScore,
} from 'modules/shared/services/supabase/gameday.service';
import { upsertLiveScore, finishLiveScore } from 'modules/shared/services/supabase/liveScore.service';
import { fetchTriviaQuestions, shuffleAnswers, calculatePoints } from 'modules/shared/services/trivia.service';
import { useTimer } from 'modules/shared/hooks/useTimer';
import { useSound } from 'modules/shared/hooks/useSound';
import type { Team, Participant, Gameday } from 'modules/shared/types/gameday.types';
import type { TriviaQuestion } from 'modules/shared/types/game.types';
import { DIFFICULTY_CONFIG, TRIVIA_CATEGORIES } from 'modules/shared/types/game.types';
import './PlayPage.css';

type PlayStep = 'select-team' | 'select-player' | 'configure' | 'playing' | 'finished';

export default function PlayPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [teams, setTeams] = useState<Team[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [step, setStep] = useState<PlayStep>('select-team');

  // Selection
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [selectedParticipant, setSelectedParticipant] = useState<Participant | null>(null);
  const [gamesPlayed, setGamesPlayed] = useState(0);
  const [maxGames, setMaxGames] = useState(3);

  // Game config (team decides)
  const [configCategory, setConfigCategory] = useState<number | null>(null);
  const [configDifficulty, setConfigDifficulty] = useState<string | null>(null);
  const [configQuestions, setConfigQuestions] = useState(10);
  const [configTime, setConfigTime] = useState(20);

  // Game state
  const [gameId, setGameId] = useState<string | null>(null);
  const [questions, setQuestions] = useState<TriviaQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [correctAnswers, setCorrectAnswers] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
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

  // Load gameday data
  useEffect(() => {
    if (!id) return;
    const load = async () => {
      const gd = await getGameday(id);
      setMaxGames((gd as Gameday).max_games_per_participant);
      const teamsList = await getTeamsByGameday(id);
      setTeams(teamsList as Team[]);
    };
    load();
  }, [id]);

  // Load participants when team is selected
  useEffect(() => {
    if (!selectedTeam) return;
    getParticipantsByTeam(selectedTeam.id).then((p) => setParticipants(p as Participant[]));
  }, [selectedTeam]);

  // Check how many games this participant has played
  useEffect(() => {
    if (!id || !selectedParticipant) return;
    getParticipantGamesCount(id, selectedParticipant.id).then(setGamesPlayed);
  }, [id, selectedParticipant]);

  // Start game — create game record and fetch questions
  const startPlaying = async () => {
    if (!id || !selectedTeam || !selectedParticipant) return;
    setIsLoading(true);
    try {
      // Create game record in DB
      const game = await createGame({
        gameday_id: id,
        team_id: selectedTeam.id,
        category: configCategory,
        difficulty: configDifficulty,
        questions_per_round: configQuestions,
        time_per_question: configTime,
      });
      setGameId((game as { id: string }).id);

      // Fetch questions
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

      // Send initial live score
      const categoryName = configCategory
        ? TRIVIA_CATEGORIES.find((c) => c.id === configCategory)?.name ?? 'Mixta'
        : 'Todas las categorías';

      upsertLiveScore({
        gameday_id: id,
        team_id: selectedTeam.id,
        participant_id: selectedParticipant.id,
        current_score: 0,
        current_correct: 0,
        current_question: 1,
        total_questions: configQuestions,
        current_streak: 0,
        is_playing: true,
        category_name: categoryName,
        participant_name: selectedParticipant.name,
        participant_avatar: selectedParticipant.avatar,
        games_completed: gamesPlayed,
      }).catch(console.error);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle answer
  const handleAnswer = (answer: string) => {
    if (showResult || !currentQuestion || !id || !selectedTeam || !selectedParticipant) return;
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

    // Update live score in real-time
    upsertLiveScore({
      gameday_id: id,
      team_id: selectedTeam.id,
      participant_id: selectedParticipant.id,
      current_score: newScore,
      current_correct: newCorrect,
      current_question: currentIndex + 1,
      total_questions: questions.length,
      current_streak: newStreak,
      is_playing: true,
      participant_name: selectedParticipant.name,
      participant_avatar: selectedParticipant.avatar,
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

  // Save score when finished
  useEffect(() => {
    if (step !== 'finished') {
      hasSavedRef.current = false;
      return;
    }
    if (hasSavedRef.current) return;
    if (!id || !selectedTeam || !selectedParticipant || !gameId) return;

    hasSavedRef.current = true;
    playVictory();

    // Mark live score as finished
    finishLiveScore(id, selectedParticipant.id).catch(console.error);

    saveScore({
      gameday_id: id,
      team_id: selectedTeam.id,
      participant_id: selectedParticipant.id,
      game_id: gameId,
      score,
      correct_answers: correctAnswers,
      total_questions: questions.length,
      best_streak: bestStreak,
      time_per_question: configTime,
      category: configCategory?.toString() ?? null,
      difficulty: configDifficulty ?? null,
    }).then(() => {
      setGamesPlayed((prev) => prev + 1);
    }).catch(console.error);
  }, [step, id, selectedTeam, selectedParticipant, gameId, score, correctAnswers, questions.length, bestStreak, configTime, configCategory, configDifficulty, playVictory]);

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
    if (answer === currentQuestion?.correct_answer) return 'play__answer--correct';
    if (answer === selectedAnswer && answer !== currentQuestion?.correct_answer) return 'play__answer--wrong';
    return 'play__answer--dimmed';
  };

  // ============ RENDER ============

  // Step 1: Select team
  if (step === 'select-team') {
    return (
      <div className="play">
        <button className="play__back" onClick={() => navigate(`/gameday/${id}`)}>← Volver</button>
        <div className="play__select-card">
          <h2 className="play__select-title">⚔️ Selecciona tu equipo</h2>
          <div className="play__teams-list">
            {teams.map((team) => (
              <motion.button
                key={team.id}
                className="play__team-option"
                style={{ borderColor: team.color }}
                onClick={() => { setSelectedTeam(team); setStep('select-player'); }}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
              >
                <span className="play__team-option-avatar">{team.avatar}</span>
                <span style={{ color: team.color }}>{team.name}</span>
              </motion.button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Step 2: Select player
  if (step === 'select-player') {
    return (
      <div className="play">
        <button className="play__back" onClick={() => setStep('select-team')}>← Cambiar equipo</button>
        <div className="play__select-card">
          <div className="play__team-badge" style={{ borderColor: selectedTeam?.color }}>
            <span>{selectedTeam?.avatar}</span>
            <span style={{ color: selectedTeam?.color }}>{selectedTeam?.name}</span>
          </div>
          <h2 className="play__select-title">👤 ¿Quién eres?</h2>
          <div className="play__participants-list">
            {participants.map((p) => (
              <motion.button
                key={p.id}
                className={`play__participant-option ${selectedParticipant?.id === p.id ? 'play__participant-option--selected' : ''}`}
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
              className="play__start-btn"
              onClick={() => setStep('configure')}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              disabled={gamesPlayed >= maxGames}
            >
              {gamesPlayed >= maxGames
                ? `🚫 Sin juegos restantes (${gamesPlayed}/${maxGames})`
                : `Continuar → (${maxGames - gamesPlayed} juegos restantes)`}
            </motion.button>
          )}
        </div>
      </div>
    );
  }

  // Step 3: Configure game (team decides together)
  if (step === 'configure') {
    return (
      <div className="play">
        <button className="play__back" onClick={() => setStep('select-player')}>← Atrás</button>
        <div className="play__select-card">
          <div className="play__team-badge" style={{ borderColor: selectedTeam?.color }}>
            <span>{selectedTeam?.avatar}</span>
            <span style={{ color: selectedTeam?.color }}>{selectedTeam?.name}</span>
          </div>
          <h2 className="play__select-title">⚙️ Configura la partida</h2>
          <p className="play__config-hint">Decidan como equipo cómo quieren jugar</p>

          {/* Category */}
          <div className="play__config-field">
            <label>Categoría</label>
            <select
              value={configCategory ?? ''}
              onChange={(e) => setConfigCategory(e.target.value ? Number(e.target.value) : null)}
            >
              <option value="">🎲 Todas las categorías</option>
              {TRIVIA_CATEGORIES.map((cat) => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>

          {/* Difficulty */}
          <div className="play__config-field">
            <label>Dificultad</label>
            <div className="play__diff-options">
              {[
                { value: null, label: '🎲 Mixta' },
                { value: 'easy', label: '🟢 Fácil' },
                { value: 'medium', label: '🟡 Medio' },
                { value: 'hard', label: '🔴 Difícil' },
              ].map((opt) => (
                <button
                  key={opt.label}
                  className={`play__diff-btn ${configDifficulty === opt.value ? 'play__diff-btn--active' : ''}`}
                  onClick={() => setConfigDifficulty(opt.value)}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Questions */}
          <div className="play__config-field">
            <label>Preguntas: <strong>{configQuestions}</strong></label>
            <input
              type="range"
              min={5}
              max={30}
              step={5}
              value={configQuestions}
              onChange={(e) => setConfigQuestions(Number(e.target.value))}
            />
            <div className="play__range-labels"><span>5</span><span>30</span></div>
          </div>

          {/* Time */}
          <div className="play__config-field">
            <label>Tiempo por pregunta: <strong>{configTime}s</strong></label>
            <input
              type="range"
              min={10}
              max={120}
              step={5}
              value={configTime}
              onChange={(e) => setConfigTime(Number(e.target.value))}
            />
            <div className="play__range-labels"><span>10s</span><span>2 min</span></div>
          </div>

          <motion.button
            className="play__start-btn"
            onClick={startPlaying}
            disabled={isLoading}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            {isLoading ? '⏳ Cargando preguntas...' : '🚀 ¡A jugar!'}
          </motion.button>
        </div>
      </div>
    );
  }

  // Step 5: Finished
  if (step === 'finished') {
    const accuracy = questions.length ? Math.round((correctAnswers / questions.length) * 100) : 0;
    return (
      <div className="play">
        <div className="play__finished-card">
          <h2 className="play__finished-title">🎉 ¡Completado!</h2>
          <div className="play__finished-team" style={{ color: selectedTeam?.color }}>
            {selectedTeam?.avatar} {selectedTeam?.name}
          </div>
          <p className="play__finished-player">{selectedParticipant?.avatar} {selectedParticipant?.name}</p>

          <div className="play__finished-stats">
            <div className="play__finished-stat">
              <span className="play__finished-stat-value">⭐ {score.toLocaleString()}</span>
              <span>Puntos</span>
            </div>
            <div className="play__finished-stat">
              <span className="play__finished-stat-value">✅ {correctAnswers}/{questions.length}</span>
              <span>Correctas</span>
            </div>
            <div className="play__finished-stat">
              <span className="play__finished-stat-value">🎯 {accuracy}%</span>
              <span>Precisión</span>
            </div>
            <div className="play__finished-stat">
              <span className="play__finished-stat-value">🔥 {bestStreak}</span>
              <span>Mejor racha</span>
            </div>
          </div>

          <p className="play__finished-msg">
            ¡Tu score se sumó al equipo <strong style={{ color: selectedTeam?.color }}>{selectedTeam?.name}</strong>!
          </p>

          <div className="play__games-remaining">
            {gamesPlayed >= maxGames
              ? <span className="play__games-exhausted">🚫 Has usado todos tus juegos ({gamesPlayed}/{maxGames})</span>
              : <span className="play__games-left">🎮 Juegos restantes: <strong>{maxGames - gamesPlayed}</strong> de {maxGames}</span>
            }
          </div>

          <div className="play__finished-actions">
            <motion.button
              className="play__btn--primary"
              onClick={() => { setStep('configure'); setSelectedAnswer(null); setShowResult(false); }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              disabled={gamesPlayed >= maxGames}
            >
              {gamesPlayed >= maxGames ? '🚫 Sin juegos' : '🔄 Jugar de nuevo'}
            </motion.button>
            <motion.button
              className="play__btn--secondary"
              onClick={() => navigate(`/gameday/${id}/dashboard`)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              📊 Ver Dashboard
            </motion.button>
            <motion.button
              className="play__btn--secondary"
              onClick={() => navigate(`/gameday/${id}`)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              ← Volver al GameDay
            </motion.button>
          </div>
        </div>
      </div>
    );
  }

  // Step 4: PLAYING
  if (!currentQuestion) return null;
  const difficultyInfo = DIFFICULTY_CONFIG[currentQuestion.difficulty];

  return (
    <div className="play play--gaming">
      {/* Header */}
      <div className="play__game-header">
        <div className="play__game-team" style={{ color: selectedTeam?.color }}>
          {selectedTeam?.avatar} {selectedTeam?.name}
        </div>
        <div className="play__game-info">
          <span>⭐ {score}</span>
          {streak > 1 && <span className="play__streak">🔥 x{streak}</span>}
        </div>
        <div className="play__game-progress">
          {currentIndex + 1}/{questions.length}
        </div>
      </div>

      {/* Progress bar */}
      <div className="play__progress-bar">
        <motion.div
          className="play__progress-fill"
          style={{ background: selectedTeam?.color }}
          animate={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
        />
      </div>

      {/* Timer */}
      <div className="play__timer">
        <svg viewBox="0 0 100 100" className="play__timer-svg">
          <circle cx="50" cy="50" r="45" className="play__timer-bg" />
          <circle
            cx="50" cy="50" r="45"
            className="play__timer-progress"
            style={{
              strokeDasharray: `${2 * Math.PI * 45}`,
              strokeDashoffset: `${2 * Math.PI * 45 * (1 - percentage / 100)}`,
              stroke: getTimerColor(),
            }}
          />
        </svg>
        <span className="play__timer-text" style={{ color: getTimerColor() }}>{timeRemaining}</span>
      </div>

      {/* Category & difficulty */}
      <div className="play__meta">
        <span>{currentQuestion.category}</span>
        <span style={{ color: difficultyInfo.color }}>{difficultyInfo.label}</span>
      </div>

      {/* Question */}
      <motion.div
        key={currentIndex}
        className="play__question"
        initial={{ opacity: 0, x: 30 }}
        animate={{ opacity: 1, x: 0 }}
      >
        {currentQuestion.question}
      </motion.div>

      {/* Answers */}
      <div className="play__answers">
        {answers.map((answer, i) => (
          <motion.button
            key={answer}
            className={`play__answer ${getAnswerClass(answer)}`}
            onClick={() => handleAnswer(answer)}
            disabled={showResult}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
            whileHover={!showResult ? { scale: 1.02 } : {}}
            whileTap={!showResult ? { scale: 0.98 } : {}}
          >
            <span className="play__answer-letter">{String.fromCharCode(65 + i)}</span>
            <span>{answer}</span>
          </motion.button>
        ))}
      </div>

      {/* Result */}
      {showResult && (
        <motion.div
          className="play__result"
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {selectedAnswer === currentQuestion.correct_answer && <span className="play__result--correct">✅ ¡Correcto!</span>}
          {selectedAnswer && selectedAnswer !== currentQuestion.correct_answer && (
            <span className="play__result--wrong">❌ Respuesta: {currentQuestion.correct_answer}</span>
          )}
          {!selectedAnswer && <span className="play__result--timeout">⏰ Respuesta: {currentQuestion.correct_answer}</span>}
          <motion.button
            className="play__next-btn"
            onClick={handleNext}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            autoFocus
          >
            {currentIndex + 1 < questions.length ? 'Siguiente →' : '🏆 Ver resultados'}
          </motion.button>
        </motion.div>
      )}
    </div>
  );
}
