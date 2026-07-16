import { useState, useCallback, useRef, useEffect } from 'react';
import type { GameState, GameConfig, Player } from 'modules/shared/types/game.types';
import { fetchTriviaQuestions, calculatePoints } from 'modules/shared/services/trivia.service';
import {
  upsertPlayer,
  saveGameSession,
  updateLeaderboard,
} from 'modules/shared/services/supabase/gameSession.service';

const initialState: GameState = {
  status: 'idle',
  currentQuestionIndex: 0,
  questions: [],
  players: [],
  config: {
    numberOfQuestions: 10,
    category: null,
    difficulty: null,
    timePerQuestion: 20,
    playerName: '',
  },
  timeRemaining: 20,
  selectedAnswer: null,
  showResult: false,
};

export function useGame() {
  const [state, setState] = useState<GameState>(initialState);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedAvatar, setSelectedAvatar] = useState('🦊');
  const bestStreakRef = useRef(0);

  const updateConfig = useCallback((updates: Partial<GameConfig>) => {
    setState((prev) => ({
      ...prev,
      config: { ...prev.config, ...updates },
    }));
  }, []);

  const startGame = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    bestStreakRef.current = 0;

    try {
      const questions = await fetchTriviaQuestions(
        state.config.numberOfQuestions,
        state.config.category,
        state.config.difficulty,
      );

      const player: Player = {
        id: crypto.randomUUID(),
        name: state.config.playerName || 'Jugador 1',
        avatar: selectedAvatar,
        score: 0,
        streak: 0,
        correctAnswers: 0,
        totalAnswers: 0,
      };

      setState((prev) => ({
        ...prev,
        status: 'playing',
        questions,
        players: [player],
        currentQuestionIndex: 0,
        selectedAnswer: null,
        showResult: false,
        timeRemaining: prev.config.timePerQuestion,
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar las preguntas');
    } finally {
      setIsLoading(false);
    }
  }, [state.config, selectedAvatar]);

  const selectAnswer = useCallback(
    (answer: string, timeRemaining: number) => {
      const currentQuestion = state.questions[state.currentQuestionIndex];
      const isCorrect = answer === currentQuestion.correct_answer;

      setState((prev) => {
        const updatedPlayers = prev.players.map((player, index) => {
          if (index === 0) {
            const newStreak = isCorrect ? player.streak + 1 : 0;
            const points = isCorrect
              ? calculatePoints(
                  currentQuestion.difficulty,
                  timeRemaining,
                  prev.config.timePerQuestion,
                  player.streak,
                )
              : 0;

            // Track best streak
            if (newStreak > bestStreakRef.current) {
              bestStreakRef.current = newStreak;
            }

            return {
              ...player,
              score: player.score + points,
              streak: newStreak,
              correctAnswers: player.correctAnswers + (isCorrect ? 1 : 0),
              totalAnswers: player.totalAnswers + 1,
            };
          }
          return player;
        });

        return {
          ...prev,
          selectedAnswer: answer,
          showResult: true,
          players: updatedPlayers,
        };
      });

      return isCorrect;
    },
    [state.questions, state.currentQuestionIndex],
  );

  // Guard to prevent double-save in React StrictMode
  const hasSavedRef = useRef(false);

  // Save to Supabase when game status changes to 'finished'
  useEffect(() => {
    if (state.status !== 'finished') {
      hasSavedRef.current = false;
      return;
    }
    if (hasSavedRef.current) return;

    const finalPlayer = state.players[0];
    if (!finalPlayer) return;

    hasSavedRef.current = true;

    const save = async () => {
      try {
        const playerId = await upsertPlayer(finalPlayer.name, finalPlayer.avatar);

        await saveGameSession({
          player_id: playerId,
          score: finalPlayer.score,
          correct_answers: finalPlayer.correctAnswers,
          total_questions: finalPlayer.totalAnswers,
          category: state.config.category?.toString() ?? null,
          difficulty: state.config.difficulty,
          best_streak: bestStreakRef.current,
          time_per_question: state.config.timePerQuestion,
        });

        await updateLeaderboard(
          playerId,
          finalPlayer.name,
          finalPlayer.avatar,
          finalPlayer.score,
          finalPlayer.correctAnswers,
          finalPlayer.totalAnswers,
          bestStreakRef.current,
        );
      } catch (err) {
        console.error('Error saving to Supabase:', err);
      }
    };

    save();
  }, [state.status, state.players, state.config]);

  const nextQuestion = useCallback(() => {
    setState((prev) => {
      const nextIndex = prev.currentQuestionIndex + 1;
      if (nextIndex >= prev.questions.length) {
        return { ...prev, status: 'finished' };
      }
      return {
        ...prev,
        currentQuestionIndex: nextIndex,
        selectedAnswer: null,
        showResult: false,
        timeRemaining: prev.config.timePerQuestion,
      };
    });
  }, []);

  const timeUp = useCallback(() => {
    setState((prev) => {
      if (prev.showResult) return prev;

      const updatedPlayers = prev.players.map((player, index) => {
        if (index === 0) {
          return {
            ...player,
            streak: 0,
            totalAnswers: player.totalAnswers + 1,
          };
        }
        return player;
      });

      return {
        ...prev,
        showResult: true,
        selectedAnswer: null,
        players: updatedPlayers,
      };
    });
  }, []);

  const resetGame = useCallback(() => {
    setState(initialState);
    setError(null);
    bestStreakRef.current = 0;
  }, []);

  const goToLobby = useCallback(() => {
    setState((prev) => ({ ...prev, status: 'lobby' }));
  }, []);

  const currentQuestion = state.questions[state.currentQuestionIndex] || null;
  const player = state.players[0] || null;
  const progress = state.questions.length
    ? ((state.currentQuestionIndex + 1) / state.questions.length) * 100
    : 0;

  return {
    state,
    currentQuestion,
    player,
    progress,
    isLoading,
    error,
    selectedAvatar,
    setSelectedAvatar,
    updateConfig,
    startGame,
    selectAnswer,
    nextQuestion,
    timeUp,
    resetGame,
    goToLobby,
  };
}
