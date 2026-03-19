import { useSearchParams, useParams, useNavigate } from 'react-router-dom';
import FlappyBirdGame from '@/games/FlappyBirdGame';
import { useCallback, useEffect, useRef, useState } from 'react';

// 게임별 최대 시간 (초)
const MAX_TIMES: Record<string, number> = {
  flappy: 60,
  dino: 40,
};

// 모든 플레이어가 끝날 때까지 기다리는 버퍼 (초)
const MAX_TIME_BUFFER = 15;

const GamePage = () => {
  const { game_type } = useParams<{ game_type: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const tableName = searchParams.get('table_name') ?? '';

  const maxTime = MAX_TIMES[game_type || ''] || 60;

  const [waitPhase, setWaitPhase] = useState(false);
  const [remaining, setRemaining] = useState(0);
  const savedScore = useRef<number>(0);

  const goToResult = useCallback((score: number) => {
    navigate(`/webview/games/result?score=${score}&table_name=${tableName}`);
  }, [navigate, tableName]);

  // 대기 타이머
  useEffect(() => {
    if (!waitPhase) return;
    if (remaining <= 0) {
      goToResult(savedScore.current);
      return;
    }
    const timer = setTimeout(() => setRemaining(r => r - 1), 1000);
    return () => clearTimeout(timer);
  }, [waitPhase, remaining, goToResult]);

  // 게임 종료 콜백: remaining = maxTime + BUFFER - elapsedSec
  const handleGameEnd = useCallback((score: number, elapsedSec: number) => {
    savedScore.current = score;
    const wait = Math.max(0, Math.round(maxTime + MAX_TIME_BUFFER - elapsedSec));
    if (wait <= 0) {
      goToResult(score);
    } else {
      setRemaining(wait);
      setWaitPhase(true);
    }
  }, [maxTime, goToResult]);

  // 대기 화면
  if (waitPhase) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background gap-6">
        <p className="font-arcade text-2xl text-neon-green animate-pulse">WAITING...</p>
        <p className="font-arcade text-5xl text-neon-yellow">{remaining}</p>
        <p className="font-display text-xs text-muted-foreground">다른 플레이어를 기다리는 중</p>
      </div>
    );
  }

  if (game_type === 'flappy') {
    return <FlappyBirdGame onGameEnd={handleGameEnd} maxTime={maxTime} />;
  }

  return (
    <div className="flex min-h-full items-center justify-center bg-background">
      <p className="font-arcade text-neon-pink">Unknown game type: {game_type}</p>
    </div>
  );
};

export default GamePage;
