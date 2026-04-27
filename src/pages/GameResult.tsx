import { useSearchParams } from 'react-router-dom';

const GameResult = () => {
  const [searchParams] = useSearchParams();
  const score = searchParams.get('score') || '0';
  const tableName = searchParams.get('table_name') || '';

  return (
    <div className="flex min-h-full items-center justify-center bg-background">
      <div className="text-center p-8">
        <h1 className="text-3xl font-arcade text-neon-green mb-6">RESULTS</h1>
        <div className="bg-card border border-border rounded-xl p-8 glow-green">
          <p className="text-5xl font-arcade text-neon-yellow mb-4">{score}</p>
          <p className="text-sm font-display text-muted-foreground">POINTS</p>
          {tableName && (
            <p className="text-xs font-display text-muted-foreground mt-4">
              Table: {tableName}
            </p>
          )}
          <div className="mt-6 pt-6 border-t border-border">
            <p className="text-lg font-arcade text-neon-cyan animate-pulse">
              Waiting for all players to finish...
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GameResult;
