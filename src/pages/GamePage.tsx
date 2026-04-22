import { useSearchParams, useParams, useNavigate } from 'react-router-dom';
import FlappyBirdGame from '@/games/FlappyBirdGame';
import { useCallback } from 'react';

const MAX_TIMES: Record<string, number> = {
  flappy: 60,
  dino: 40,
};

const GamePage = () => {
  const { game_type } = useParams<{ game_type: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const tableName = searchParams.get('table_name') ?? '';

  const maxTime = MAX_TIMES[game_type || ''] || 60;

  const handleGameEnd = useCallback((score: number) => {
    navigate(`/webview/games/result?score=${score}&table_name=${tableName}&finished=1`);
  }, [navigate, tableName]);

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
