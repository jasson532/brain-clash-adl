import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { TriviaQuestion, Player } from 'modules/shared/types/game.types';
import { DIFFICULTY_CONFIG } from 'modules/shared/types/game.types';
import { shuffleAnswers } from 'modules/shared/services/trivia.service';
import { useTimer } from 'modules/shared/hooks/useTimer';
import { useSound } from 'modules/shared/hooks/useSound';
import './GamePlay.css';

interface GamePlayProps {
  question: TriviaQuestion;
  questionIndex: number;
  totalQuestions: number;
  player: Player;
  timePerQuestion: number;
  selectedAnswer: string | null;
  showResult: boolean;
  onSelectAnswer: (answer: string, timeRemaining: number) => boolean;
  onNext: () => void;
  onTimeUp: () => void;
}

export default function GamePlay({
  question,
  questionIndex,
  totalQuestions,
  player,
  timePerQuestion,
  selectedAnswer,
  showResult,
  onSelectAnswer,
  onNext,
  onTimeUp,
}: GamePlayProps) {
  const [lastResult, setLastResult] = useState<boolean | null>(null);
  const { playCorrect, playWrong, playTick } = useSound();

  const { timeRemaining, start, reset, percentage } = useTimer(timePerQuestion, onTimeUp);

  const answers = useMemo(() => shuffleAnswers(question), [question]);

  const difficultyInfo = DIFFICULTY_CONFIG[question.difficulty];

  // Reset timer on new question
  useEffect(() => {
    reset(timePerQuestion);
    start();
    setLastResult(null);
  }, [question, timePerQuestion, reset, start]);

  // Tick sound when time is low
  useEffect(() => {
    if (timeRemaining <= 5 && timeRemaining > 0 && !showResult) {
      playTick();
    }
  }, [timeRemaining, showResult, playTick]);

  const handleAnswer = (answer: string) => {
    if (showResult) return;
    const isCorrect = onSelectAnswer(answer, timeRemaining);
    setLastResult(isCorrect);
    if (isCorrect) {
      playCorrect();
    } else {
      playWrong();
    }
  };

  const getAnswerClass = (answer: string) => {
    if (!showResult) return '';
    if (answer === question.correct_answer) return 'gameplay__answer--correct';
    if (answer === selectedAnswer && answer !== question.correct_answer)
      return 'gameplay__answer--wrong';
    return 'gameplay__answer--dimmed';
  };

  const getTimerColor = () => {
    if (percentage > 60) return 'var(--success)';
    if (percentage > 30) return 'var(--warning)';
    return 'var(--danger)';
  };

  return (
    <div className="gameplay">
      {/* Header */}
      <div className="gameplay__header">
        <div className="gameplay__player-info">
          <span className="gameplay__player-score">⭐ {player.score}</span>
          {player.streak > 1 && (
            <motion.span
              className="gameplay__streak"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              key={player.streak}
            >
              🔥 x{player.streak}
            </motion.span>
          )}
        </div>

        <div className="gameplay__progress-info">
          <span className="gameplay__question-count">
            {questionIndex + 1} / {totalQuestions}
          </span>
          <span
            className="gameplay__difficulty-badge"
            style={{ color: difficultyInfo.color }}
          >
            {difficultyInfo.label}
          </span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="gameplay__progress-bar">
        <motion.div
          className="gameplay__progress-fill"
          initial={{ width: 0 }}
          animate={{ width: `${((questionIndex + 1) / totalQuestions) * 100}%` }}
          transition={{ duration: 0.5 }}
        />
      </div>

      {/* Timer */}
      <div className="gameplay__timer-container">
        <svg className="gameplay__timer-svg" viewBox="0 0 100 100">
          <circle
            className="gameplay__timer-bg"
            cx="50"
            cy="50"
            r="45"
          />
          <circle
            className="gameplay__timer-progress"
            cx="50"
            cy="50"
            r="45"
            style={{
              strokeDasharray: `${2 * Math.PI * 45}`,
              strokeDashoffset: `${2 * Math.PI * 45 * (1 - percentage / 100)}`,
              stroke: getTimerColor(),
            }}
          />
        </svg>
        <span
          className="gameplay__timer-text"
          style={{ color: getTimerColor() }}
        >
          {timeRemaining}
        </span>
      </div>

      {/* Category */}
      <motion.div
        className="gameplay__category"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        key={question.category}
      >
        {question.category}
      </motion.div>

      {/* Question */}
      <AnimatePresence mode="wait">
        <motion.div
          key={questionIndex}
          className="gameplay__question-card"
          initial={{ opacity: 0, x: 50, scale: 0.95 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          exit={{ opacity: 0, x: -50, scale: 0.95 }}
          transition={{ duration: 0.3 }}
        >
          <h2 className="gameplay__question-text">{question.question}</h2>
        </motion.div>
      </AnimatePresence>

      {/* Answers */}
      <div className="gameplay__answers">
        {answers.map((answer, index) => (
          <motion.button
            key={answer}
            className={`gameplay__answer ${getAnswerClass(answer)}`}
            onClick={() => handleAnswer(answer)}
            disabled={showResult}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            whileHover={!showResult ? { scale: 1.02 } : {}}
            whileTap={!showResult ? { scale: 0.98 } : {}}
          >
            <span className="gameplay__answer-letter">
              {String.fromCharCode(65 + index)}
            </span>
            <span className="gameplay__answer-text">{answer}</span>
          </motion.button>
        ))}
      </div>

      {/* Result feedback */}
      <AnimatePresence>
        {showResult && (
          <motion.div
            className="gameplay__result"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            {lastResult === true && (
              <div className="gameplay__result-correct">
                <span>✅ ¡Correcto!</span>
                {player.streak > 1 && <span className="gameplay__bonus">Racha x{player.streak} 🔥</span>}
              </div>
            )}
            {lastResult === false && (
              <div className="gameplay__result-wrong">
                <span>❌ Incorrecto</span>
                <span className="gameplay__correct-answer">
                  Respuesta: {question.correct_answer}
                </span>
              </div>
            )}
            {lastResult === null && (
              <div className="gameplay__result-timeout">
                <span>⏰ ¡Se acabó el tiempo!</span>
                <span className="gameplay__correct-answer">
                  Respuesta: {question.correct_answer}
                </span>
              </div>
            )}

            <motion.button
              className="gameplay__next-btn"
              onClick={onNext}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              autoFocus
            >
              {questionIndex + 1 < totalQuestions ? 'Siguiente →' : '🏆 Ver resultados'}
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
