import { useSearchParams, useParams, useNavigate } from 'react-router-dom';
import FlappyBirdGame from '@/games/FlappyBirdGame';
import { useCallback } from 'react';

const MAX_TIMES: Record<string, number> = {
  flappy: 45,
};

const GamePage = () => {
  const { game_type } = useParams<{ game_type: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const tableName = searchParams.get('table_name') ?? '';

  const maxTime = MAX_TIMES[game_type || ''] || 45;

  const handleGameEnd = useCallback((score: number) => {
    // Navigate to result URL with score
    navigate(`/webview/games/result?score=${score}&table_name=${tableName}`);
  }, [navigate, tableName]);

  if (game_type === 'flappy') {
    return <FlappyBirdGame onGameEnd={handleGameEnd} maxTime={maxTime} />;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <p className="font-arcade text-neon-pink">Unknown game type: {game_type}</p>
    </div>
  );
};

export default GamePage;
