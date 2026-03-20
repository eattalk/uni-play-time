import { useSearchParams } from 'react-router-dom';
import { useEffect, useState } from 'react';

interface RankEntry {
  rank: number;
  name: string;
  score: number;
  isMe: boolean;
}

declare global {
  interface Window {
    showGameResult: (data: string | RankEntry[]) => void;
  }
}

const MEDAL = ['🥇', '🥈', '🥉'];

const rankColor = (rank: number) => {
  if (rank === 1) return 'text-neon-yellow';
  if (rank === 2) return 'text-neon-blue';
  if (rank === 3) return 'text-neon-pink';
  return 'text-foreground';
};

const rankGlow = (rank: number) => {
  if (rank === 1) return 'border-neon-yellow shadow-[0_0_18px_hsl(var(--neon-yellow)/0.5)]';
  if (rank === 2) return 'border-neon-blue shadow-[0_0_18px_hsl(var(--neon-blue)/0.5)]';
  if (rank === 3) return 'border-neon-pink shadow-[0_0_18px_hsl(var(--neon-pink)/0.5)]';
  return 'border-border';
};

const GameResult = () => {
  const [searchParams] = useSearchParams();
  const score = searchParams.get('score') || '0';

  const [rankings, setRankings] = useState<RankEntry[] | null>(null);

  useEffect(() => {
    // Android WebView bridge: Android calls window.showGameResult(jsonString or array)
    window.showGameResult = (data: string | RankEntry[]) => {
      try {
        const parsed: RankEntry[] =
          typeof data === 'string' ? JSON.parse(data) : data;
        setRankings(parsed);
      } catch {
        console.error('showGameResult: invalid data', data);
      }
    };

    return () => {
      // cleanup
      window.showGameResult = () => {};
    };
  }, []);

  /* ── Loading state ── */
  if (!rankings) {
    return (
      <div className="flex min-h-full flex-col items-center justify-center gap-8 bg-background">
        {/* Score badge */}
        <div className="text-center">
          <p className="text-xs font-display text-muted-foreground mb-1 tracking-widest">MY SCORE</p>
          <p className="text-5xl font-arcade text-neon-yellow">{score}</p>
        </div>

        {/* Spinner */}
        <div className="flex flex-col items-center gap-4">
          <div className="relative w-16 h-16">
            <div className="absolute inset-0 rounded-full border-4 border-muted" />
            <div className="absolute inset-0 rounded-full border-4 border-t-primary border-r-transparent border-b-transparent border-l-transparent animate-spin" />
          </div>
          <p className="font-display text-sm text-muted-foreground tracking-widest animate-pulse">
            결과 집계 중...
          </p>
        </div>

        {/* Dots */}
        <div className="flex gap-2">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="w-2 h-2 rounded-full bg-primary animate-bounce"
              style={{ animationDelay: `${i * 0.2}s` }}
            />
          ))}
        </div>
      </div>
    );
  }

  /* ── Ranking state ── */
  return (
    <div className="flex min-h-full flex-col items-center justify-center gap-6 bg-background px-4 py-8">
      <h1 className="text-2xl font-arcade text-neon-green">RESULTS</h1>

      <div className="w-full max-w-sm flex flex-col gap-3">
        {rankings.map((entry, idx) => (
          <div
            key={idx}
            className={`flex items-center gap-4 rounded-xl border-2 bg-card px-4 py-3 transition-all
              ${rankGlow(entry.rank)}
              ${entry.isMe ? 'ring-2 ring-primary ring-offset-2 ring-offset-background' : ''}
            `}
            style={{
              animationDelay: `${idx * 0.1}s`,
            }}
          >
            {/* Rank */}
            <span className="text-xl w-8 text-center">
              {entry.rank <= 3 ? MEDAL[entry.rank - 1] : `${entry.rank}`}
            </span>

            {/* Name */}
            <span
              className={`flex-1 font-display text-sm font-bold truncate ${rankColor(entry.rank)}`}
            >
              {entry.name}
              {entry.isMe && (
                <span className="ml-2 text-xs text-primary">(나)</span>
              )}
            </span>

            {/* Score */}
            <span className={`font-arcade text-sm ${rankColor(entry.rank)}`}>
              {entry.score.toLocaleString()}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default GameResult;
