import { AnimatePresence, motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useGame } from '../hooks/useGame';
import LandingPage from '../components/LandingPage/LandingPage';
import LobbyPage from '../components/LobbyPage/LobbyPage';
import GamePlay from '../components/GamePlay/GamePlay';
import ResultsPage from '../components/ResultsPage/ResultsPage';

export default function SoloGamePage() {
  const navigate = useNavigate();
  const {
    state,
    currentQuestion,
    player,
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
  } = useGame();

  const handleGoHome = () => navigate('/');

  return (
    <AnimatePresence mode="wait">
      {state.status === 'idle' && (
        <motion.div
          key="landing"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <LandingPage onStart={goToLobby} />
        </motion.div>
      )}

      {state.status === 'lobby' && (
        <motion.div
          key="lobby"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <LobbyPage
            config={state.config}
            selectedAvatar={selectedAvatar}
            onSelectAvatar={setSelectedAvatar}
            onUpdateConfig={updateConfig}
            onStart={startGame}
            onBack={resetGame}
            isLoading={isLoading}
            error={error}
          />
        </motion.div>
      )}

      {state.status === 'playing' && currentQuestion && player && (
        <motion.div
          key="gameplay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <GamePlay
            question={currentQuestion}
            questionIndex={state.currentQuestionIndex}
            totalQuestions={state.questions.length}
            player={player}
            timePerQuestion={state.config.timePerQuestion}
            selectedAnswer={state.selectedAnswer}
            showResult={state.showResult}
            onSelectAnswer={selectAnswer}
            onNext={nextQuestion}
            onTimeUp={timeUp}
          />
        </motion.div>
      )}

      {state.status === 'finished' && player && (
        <motion.div
          key="results"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <ResultsPage
            player={player}
            totalQuestions={state.questions.length}
            onPlayAgain={goToLobby}
            onGoHome={handleGoHome}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
