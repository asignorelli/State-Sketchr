import React, { useState, useCallback, useMemo } from 'react';
import { GameMode, US_STATES } from './constants';
import { GameStatus } from './types';
import type { StateName, Score } from './types';
import Header from './components/Header';
import Welcome from './components/Welcome';
import Drawing from './components/Drawing';
import Results from './components/Results';
import StateSelectionModal from './components/StateSelectionModal';
import { judgeDrawing } from './services/geminiService';

const App: React.FC = () => {
  const [gameStatus, setGameStatus] = useState<GameStatus>(GameStatus.Welcome);
  const [gameMode, setGameMode] = useState<GameMode | null>(null);
  const [challengeStates, setChallengeStates] = useState<StateName[]>([]);
  const [currentState, setCurrentState] = useState<StateName | null>(null);
  const [lastDrawing, setLastDrawing] = useState<string | null>(null);
  const [score, setScore] = useState<Score | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentChallengeIndex = useMemo(() => {
    if (gameMode !== GameMode.Challenge || !currentState) return -1;
    return challengeStates.indexOf(currentState);
  }, [gameMode, challengeStates, currentState]);

  const startNewGame = useCallback((mode: GameMode, state?: StateName) => {
    setGameMode(mode);
    setScore(null);
    setLastDrawing(null);
    setError(null);

    if (mode === GameMode.Random) {
      const randomIndex = Math.floor(Math.random() * US_STATES.length);
      setCurrentState(US_STATES[randomIndex]);
      setGameStatus(GameStatus.Drawing);
    } else if (mode === GameMode.Challenge) {
      const sortedStates = [...US_STATES].sort();
      setChallengeStates(sortedStates);
      setCurrentState(sortedStates[0]);
      setGameStatus(GameStatus.Drawing);
    } else if (mode === GameMode.Choose && state) {
      setCurrentState(state);
      setGameStatus(GameStatus.Drawing);
      setIsModalOpen(false);
    } else if (mode === GameMode.Choose) {
      setIsModalOpen(true);
    }
  }, []);

  const handleSubmission = useCallback(async (drawingDataUrl: string) => {
    if (!currentState) return;
    setLastDrawing(drawingDataUrl);
    setGameStatus(GameStatus.Judging);
    setError(null);
    try {
      const result = await judgeDrawing(drawingDataUrl, currentState);
      setScore(result);
      setGameStatus(GameStatus.Results);
    } catch (err) {
      console.error(err);
      const errorMessage =
        err instanceof Error ? err.message : 'Could not get score from AI. Please try again.';
      setError(errorMessage);
      setGameStatus(GameStatus.Drawing);
    }
  }, [currentState]);

  const handleNextState = useCallback(() => {
    setScore(null);
    setLastDrawing(null);
    setError(null);
    if (gameMode === GameMode.Random) {
      startNewGame(GameMode.Random);
    } else if (gameMode === GameMode.Challenge) {
      const nextIndex = currentChallengeIndex + 1;
      if (nextIndex < challengeStates.length) {
        setCurrentState(challengeStates[nextIndex]);
        setGameStatus(GameStatus.Drawing);
      } else {
        setGameStatus(GameStatus.Welcome);
        setGameMode(null);
      }
    } else if (gameMode === GameMode.Choose) {
      setIsModalOpen(true);
    }
  }, [gameMode, challengeStates, currentChallengeIndex, startNewGame]);

  const resetToHome = () => {
    setGameStatus(GameStatus.Welcome);
    setGameMode(null);
    setCurrentState(null);
    setScore(null);
    setLastDrawing(null);
    setError(null);
  };

  const renderContent = () => {
    switch (gameStatus) {
      case GameStatus.Drawing:
      case GameStatus.Judging:
        if (currentState) {
          return (
            <Drawing
              stateName={currentState}
              onSubmit={handleSubmission}
              isJudging={gameStatus === GameStatus.Judging}
              error={error}
              challengeProgress={
                gameMode === GameMode.Challenge
                  ? { current: currentChallengeIndex + 1, total: challengeStates.length }
                  : undefined
              }
            />
          );
        }
        return <Welcome onStart={startNewGame} />;
      case GameStatus.Results:
        if (currentState && lastDrawing && score) {
          return (
            <Results
              stateName={currentState}
              userDrawing={lastDrawing}
              score={score}
              onNext={handleNextState}
              isLastInChallenge={
                gameMode === GameMode.Challenge &&
                currentChallengeIndex === challengeStates.length - 1
              }
            />
          );
        }
        return <Welcome onStart={startNewGame} />;
      case GameStatus.Welcome:
      default:
        return <Welcome onStart={startNewGame} />;
    }
  };

  const isWelcome = gameStatus === GameStatus.Welcome;

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 flex flex-col font-sans">
      {/* Hide header on Welcome page */}
      {!isWelcome && (
        <Header onSelectMode={startNewGame} onHomeClick={resetToHome} />
      )}

      {/* Center the welcome content; constrain others to max width */}
      <main
        className={
          isWelcome
            ? 'flex-1 flex items-center justify-center px-4'
            : 'w-full max-w-5xl mx-auto flex-1 flex flex-col items-center justify-center mt-8 px-4'
        }
      >
        {renderContent()}
      </main>

      <StateSelectionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSelectState={(state) => startNewGame(GameMode.Choose, state)}
      />
    </div>
  );
};

export default App;
