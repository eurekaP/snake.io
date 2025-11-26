import React, { useState } from 'react';
import GameCanvas from './components/GameCanvas';
import { GameState } from './types';
import { Play, Trophy, Skull } from 'lucide-react';

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>(GameState.MENU);
  const [playerName, setPlayerName] = useState<string>('');
  const [finalScore, setFinalScore] = useState<number>(0);
  const [currentScore, setCurrentScore] = useState<number>(0);
  const [leaderboard, setLeaderboard] = useState<{name: string, score: number}[]>([]);

  const handleStartGame = (e: React.FormEvent) => {
    e.preventDefault();
    if (playerName.trim()) {
      setGameState(GameState.PLAYING);
    }
  };

  const handleGameOver = (score: number) => {
    setFinalScore(score);
    setGameState(GameState.GAME_OVER);
  };

  return (
    <div className="relative w-full h-full min-h-screen overflow-hidden bg-gray-900 font-sans text-white">
      {/* Game Canvas is always rendered but logic pauses if not playing */}
      <GameCanvas 
        gameState={gameState} 
        playerName={playerName} 
        onGameOver={handleGameOver}
        setScore={setCurrentScore}
        setLeaderboard={setLeaderboard}
      />

      {/* Main Menu */}
      {gameState === GameState.MENU && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm z-50 animate-in fade-in duration-300">
          <div className="bg-gray-800 p-8 rounded-2xl shadow-2xl border border-gray-700 max-w-md w-full text-center">
            <h1 className="text-6xl font-black mb-2 text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-blue-500 tracking-tighter drop-shadow-lg">
              SLITHER
              <span className="text-white text-4xl">.CLONE</span>
            </h1>
            <p className="text-gray-400 mb-8">Devour orbs. Trap opponents. Survive.</p>
            
            <form onSubmit={handleStartGame} className="flex flex-col gap-4">
              <input
                type="text"
                maxLength={12}
                placeholder="Enter Nickname"
                className="w-full bg-gray-900 border-2 border-gray-700 rounded-lg px-6 py-4 text-xl font-bold text-center focus:border-green-500 focus:outline-none transition-all placeholder:text-gray-600"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                autoFocus
              />
              <button
                type="submit"
                disabled={!playerName.trim()}
                className="w-full bg-green-500 hover:bg-green-400 disabled:opacity-50 disabled:cursor-not-allowed text-black font-black text-xl py-4 rounded-lg shadow-[0_0_20px_rgba(34,197,94,0.4)] hover:shadow-[0_0_30px_rgba(34,197,94,0.6)] transition-all transform hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-2"
              >
                <Play className="w-6 h-6 fill-current" />
                PLAY NOW
              </button>
            </form>
            
            <div className="mt-8 text-sm text-gray-500">
              <p>Move with Mouse • Click/Hold to Boost</p>
            </div>
          </div>
        </div>
      )}

      {/* Game Over Screen */}
      {gameState === GameState.GAME_OVER && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-red-900/40 backdrop-blur-md z-50 animate-in zoom-in-95 duration-200">
           <div className="bg-gray-800 p-8 rounded-2xl shadow-2xl border border-red-500/50 max-w-sm w-full text-center">
             <div className="mx-auto w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mb-4">
                <Skull className="w-10 h-10 text-red-500" />
             </div>
             <h2 className="text-4xl font-black text-white mb-2">YOU DIED</h2>
             <div className="text-2xl font-bold text-gray-300 mb-6">
               Final Score: <span className="text-green-400">{finalScore}</span>
             </div>
             <button
                onClick={() => setGameState(GameState.MENU)}
                className="w-full bg-white hover:bg-gray-100 text-gray-900 font-bold py-3 rounded-lg shadow-lg transition-all transform hover:scale-105"
              >
                Play Again
             </button>
           </div>
        </div>
      )}

      {/* HUD: Score & Leaderboard */}
      {gameState === GameState.PLAYING && (
        <>
          {/* Current Score */}
          <div className="absolute bottom-6 left-6 z-10 pointer-events-none">
             <div className="text-gray-400 text-sm font-bold uppercase tracking-wider mb-1">Your Mass</div>
             <div className="text-4xl font-black text-white drop-shadow-md">
               {currentScore}
             </div>
          </div>

          {/* Leaderboard */}
          <div className="absolute top-6 right-6 bg-black/40 backdrop-blur-sm p-4 rounded-lg border border-white/10 w-48 pointer-events-none z-10">
             <div className="flex items-center gap-2 mb-3 pb-2 border-b border-white/10">
               <Trophy className="w-4 h-4 text-yellow-400" />
               <h3 className="font-bold text-sm text-gray-200 uppercase tracking-wide">Leaderboard</h3>
             </div>
             <ul className="space-y-2">
               {leaderboard.map((entry, i) => (
                 <li key={i} className="flex justify-between items-center text-sm">
                   <span className={`font-medium ${i === 0 ? 'text-yellow-400' : 'text-gray-300'} truncate max-w-[100px]`}>
                     {i+1}. {entry.name}
                   </span>
                   <span className="font-bold text-gray-400">{entry.score}</span>
                 </li>
               ))}
               {/* Always show player if playing */}
               {leaderboard.length > 0 && !leaderboard.find(l => l.name === playerName) && (
                 <li className="flex justify-between items-center text-sm pt-2 border-t border-white/10 mt-2 opacity-75">
                    <span className="font-medium text-white truncate max-w-[100px]">{playerName}</span>
                    <span className="font-bold text-gray-400">{currentScore}</span>
                 </li>
               )}
             </ul>
          </div>
          
          {/* Boost Indicator */}
          <div className="absolute bottom-6 right-6 z-10 pointer-events-none text-right">
             <div className="text-xs text-white/50 mb-1">Boost (Hold Click)</div>
             <div className="w-32 h-2 bg-gray-700 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-green-500 transition-all duration-300" 
                  style={{ width: `${Math.min(100, (currentScore / 100) * 100)}%` }} // Just a visual mock of fuel
                ></div>
             </div>
          </div>
        </>
      )}
    </div>
  );
};

export default App;
