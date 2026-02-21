import React, { useRef, useEffect, useCallback, useState } from 'react';

interface GameProps {
  onGameEnd: (score: number) => void;
  maxTime?: number; // seconds
}

type GamePhase = 'intro' | 'countdown' | 'playing' | 'gameover';

interface Bird {
  x: number;
  y: number;
  vy: number;
  radius: number;
}

interface Pipe {
  x: number;
  gapY: number;
  gapHeight: number;
  width: number;
  passed: boolean;
}

interface Star {
  x: number;
  y: number;
  radius: number;
  collected: boolean;
  angle: number;
}

interface Bomb {
  x: number;
  y: number;
  radius: number;
  hit: boolean;
  angle: number;
}

interface Bullet {
  x: number;
  y: number;
  radius: number;
  speed: number;
}

const GRAVITY = 0.45;
const FLAP_FORCE = -7.5;
const PIPE_SPEED = 2.5;
const PIPE_INTERVAL = 150;
const BIRD_X = 80;

const FlappyBirdGame: React.FC<GameProps> = ({ onGameEnd, maxTime = 60 }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [phase, setPhase] = useState<GamePhase>('intro');
  const [countdown, setCountdown] = useState(3);
  const gameRef = useRef({
    bird: { x: BIRD_X, y: 250, vy: 0, radius: 15 } as Bird,
    pipes: [] as Pipe[],
    stars: [] as Star[],
    bombs: [] as Bomb[],
    bullets: [] as Bullet[],
    score: 0,
    lives: 3,
    frameCount: 0,
    elapsedMs: 0,
    lastTimestamp: 0,
    gameStartTime: 0,
    playing: false,
    autoShootTimer: 0,
    animationId: 0,
    pipeTimer: 0,
  });

  const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
    const seconds = (totalSeconds % 60).toString().padStart(2, '0');
    const centiseconds = Math.floor((ms % 1000) / 10).toString().padStart(2, '0');
    return `${minutes}:${seconds}:${centiseconds}`;
  };

  const flap = useCallback(() => {
    if (phase === 'playing' && gameRef.current.playing) {
      gameRef.current.bird.vy = FLAP_FORCE;
    }
  }, [phase]);

  const startCountdown = useCallback(() => {
    setPhase('countdown');
    setCountdown(3);
    let count = 3;
    const interval = setInterval(() => {
      count--;
      if (count <= 0) {
        clearInterval(interval);
        setPhase('playing');
        const g = gameRef.current;
        g.playing = true;
        g.gameStartTime = performance.now();
        g.lastTimestamp = performance.now();
        g.bird = { x: BIRD_X, y: 250, vy: 0, radius: 15 };
        g.pipes = [];
        g.stars = [];
        g.bombs = [];
        g.bullets = [];
        g.score = 0;
        g.lives = 3;
        g.frameCount = 0;
        g.elapsedMs = 0;
        g.pipeTimer = 0;
        g.autoShootTimer = 0;
      } else {
        setCountdown(count);
      }
    }, 1000);
  }, []);

  // Draw functions
  const drawBird = (ctx: CanvasRenderingContext2D, bird: Bird, elapsedSec: number) => {
    ctx.save();
    // Bird body - neon style
    const grad = ctx.createRadialGradient(bird.x, bird.y, 2, bird.x, bird.y, bird.radius);
    grad.addColorStop(0, '#ffff00');
    grad.addColorStop(0.6, '#ff8800');
    grad.addColorStop(1, '#ff440055');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(bird.x, bird.y, bird.radius, 0, Math.PI * 2);
    ctx.fill();

    // Eye
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(bird.x + 5, bird.y - 3, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.arc(bird.x + 6, bird.y - 3, 2, 0, Math.PI * 2);
    ctx.fill();

    // Beak
    ctx.fillStyle = '#ff4400';
    ctx.beginPath();
    ctx.moveTo(bird.x + bird.radius, bird.y);
    ctx.lineTo(bird.x + bird.radius + 8, bird.y + 3);
    ctx.lineTo(bird.x + bird.radius, bird.y + 6);
    ctx.closePath();
    ctx.fill();

    // Wing flap animation
    const wingAngle = Math.sin(elapsedSec * 12) * 0.3;
    ctx.fillStyle = '#ffaa00';
    ctx.beginPath();
    ctx.ellipse(bird.x - 5, bird.y + 2, 10, 5, wingAngle, 0, Math.PI * 2);
    ctx.fill();

    // Neon glow
    ctx.shadowColor = '#ff8800';
    ctx.shadowBlur = 15;
    ctx.strokeStyle = '#ffaa0066';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(bird.x, bird.y, bird.radius + 2, 0, Math.PI * 2);
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.restore();
  };

  const drawPipe = (ctx: CanvasRenderingContext2D, pipe: Pipe, h: number) => {
    const gradient1 = ctx.createLinearGradient(pipe.x, 0, pipe.x + pipe.width, 0);
    gradient1.addColorStop(0, '#0a5');
    gradient1.addColorStop(0.5, '#0f8');
    gradient1.addColorStop(1, '#0a5');

    // Top pipe
    ctx.fillStyle = gradient1;
    ctx.fillRect(pipe.x, 0, pipe.width, pipe.gapY);
    ctx.strokeStyle = '#0fg';
    ctx.lineWidth = 2;
    ctx.strokeRect(pipe.x, 0, pipe.width, pipe.gapY);

    // Pipe cap top
    ctx.fillStyle = '#0d7';
    ctx.fillRect(pipe.x - 4, pipe.gapY - 15, pipe.width + 8, 15);
    ctx.strokeRect(pipe.x - 4, pipe.gapY - 15, pipe.width + 8, 15);

    // Bottom pipe
    const bottomY = pipe.gapY + pipe.gapHeight;
    ctx.fillStyle = gradient1;
    ctx.fillRect(pipe.x, bottomY, pipe.width, h - bottomY);
    ctx.strokeStyle = '#0f8';
    ctx.strokeRect(pipe.x, bottomY, pipe.width, h - bottomY);

    // Pipe cap bottom
    ctx.fillStyle = '#0d7';
    ctx.fillRect(pipe.x - 4, bottomY, pipe.width + 8, 15);
    ctx.strokeRect(pipe.x - 4, bottomY, pipe.width + 8, 15);

    // Neon glow on edges
    ctx.shadowColor = '#00ff88';
    ctx.shadowBlur = 8;
    ctx.strokeStyle = '#00ff8844';
    ctx.lineWidth = 1;
    ctx.strokeRect(pipe.x, 0, pipe.width, pipe.gapY);
    ctx.strokeRect(pipe.x, bottomY, pipe.width, h - bottomY);
    ctx.shadowBlur = 0;
  };

  const drawStar = (ctx: CanvasRenderingContext2D, star: Star) => {
    if (star.collected) return;
    ctx.save();
    ctx.translate(star.x, star.y);
    ctx.rotate(star.angle);
    ctx.fillStyle = '#ffdd00';
    ctx.shadowColor = '#ffdd00';
    ctx.shadowBlur = 12;
    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
      const angle = (i * 4 * Math.PI) / 5 - Math.PI / 2;
      const r = i === 0 ? star.radius : star.radius;
      ctx.lineTo(Math.cos(angle) * r, Math.sin(angle) * r);
      const innerAngle = angle + (2 * Math.PI) / 10;
      ctx.lineTo(Math.cos(innerAngle) * (r * 0.4), Math.sin(innerAngle) * (r * 0.4));
    }
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.restore();
  };

  const drawBomb = (ctx: CanvasRenderingContext2D, bomb: Bomb) => {
    if (bomb.hit) return;
    ctx.save();
    ctx.translate(bomb.x, bomb.y);

    // Bomb body
    ctx.fillStyle = '#222';
    ctx.shadowColor = '#ff0000';
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.arc(0, 0, bomb.radius, 0, Math.PI * 2);
    ctx.fill();

    // Skull face
    ctx.fillStyle = '#ff4444';
    ctx.font = `${bomb.radius}px serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('💣', 0, 0);

    ctx.shadowBlur = 0;
    ctx.restore();
  };

  const drawBullet = (ctx: CanvasRenderingContext2D, bullet: Bullet, enhanced: boolean) => {
    ctx.save();
    if (enhanced) {
      // Enhanced bullet - bigger, glowing
      const grad = ctx.createRadialGradient(bullet.x, bullet.y, 1, bullet.x, bullet.y, bullet.radius);
      grad.addColorStop(0, '#ffffff');
      grad.addColorStop(0.3, '#ff44ff');
      grad.addColorStop(0.7, '#8800ff');
      grad.addColorStop(1, '#8800ff00');
      ctx.fillStyle = grad;
      ctx.shadowColor = '#ff44ff';
      ctx.shadowBlur = 20;
      ctx.beginPath();
      ctx.arc(bullet.x, bullet.y, bullet.radius, 0, Math.PI * 2);
      ctx.fill();
      // Trail
      ctx.globalAlpha = 0.3;
      ctx.fillStyle = '#ff44ff';
      ctx.beginPath();
      ctx.ellipse(bullet.x - 10, bullet.y, 15, bullet.radius * 0.6, 0, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillStyle = '#00ffff';
      ctx.shadowColor = '#00ffff';
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(bullet.x, bullet.y, bullet.radius, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.shadowBlur = 0;
    ctx.restore();
  };

  // Main game loop
  useEffect(() => {
    if (phase !== 'playing') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = canvas.width;
    const H = canvas.height;
    const g = gameRef.current;

    const endGame = () => {
      g.playing = false;
      setPhase('gameover');
      setTimeout(() => onGameEnd(g.score), 1500);
    };

    const loop = (timestamp: number) => {
      if (!g.playing) return;

      const dt = timestamp - g.lastTimestamp;
      g.lastTimestamp = timestamp;
      g.elapsedMs += dt;
      g.frameCount++;

      const elapsedSec = g.elapsedMs / 1000;

      // Check max time
      if (elapsedSec >= maxTime) {
        endGame();
        return;
      }

      // Physics
      g.bird.vy += GRAVITY;
      g.bird.y += g.bird.vy;

      // Ceiling / floor
      if (g.bird.y - g.bird.radius < 0) {
        g.bird.y = g.bird.radius;
        g.bird.vy = 0;
      }
      if (g.bird.y + g.bird.radius > H) {
        g.lives--;
        if (g.lives <= 0) { endGame(); return; }
        g.bird.y = 250;
        g.bird.vy = 0;
      }

      // Generate pipes
      g.pipeTimer++;
      if (g.pipeTimer >= PIPE_INTERVAL) {
        g.pipeTimer = 0;
        const gapH = 130 - Math.min(elapsedSec * 0.5, 30); // gap shrinks over time
        const gapY = Math.random() * (H - gapH - 100) + 50;
        g.pipes.push({ x: W, gapY, gapHeight: Math.max(gapH, 90), width: 50, passed: false });

        // Spawn star or bomb in the gap
        if (Math.random() < 0.6) {
          g.stars.push({
            x: W + 25,
            y: gapY + Math.max(gapH, 90) / 2,
            radius: 10,
            collected: false,
            angle: 0,
          });
        }
        if (Math.random() < 0.3) {
          // Bomb outside gap area
          const bombY = Math.random() < 0.5
            ? gapY - 30 - Math.random() * 50
            : gapY + Math.max(gapH, 90) + 30 + Math.random() * 50;
          g.bombs.push({
            x: W + 25,
            y: Math.max(20, Math.min(H - 20, bombY)),
            radius: 12,
            hit: false,
            angle: 0,
          });
        }
      }

      // Auto shoot bullets
      g.autoShootTimer++;
      const shootInterval = elapsedSec > 10 ? 15 : 20;
      if (g.autoShootTimer >= shootInterval) {
        g.autoShootTimer = 0;
        const enhanced = elapsedSec > 10;
        g.bullets.push({
          x: g.bird.x + g.bird.radius,
          y: g.bird.y,
          radius: enhanced ? 6 : 3,
          speed: enhanced ? 8 : 6,
        });
      }

      // Update pipes
      g.pipes.forEach(p => {
        p.x -= PIPE_SPEED;
        if (!p.passed && p.x + p.width < g.bird.x) {
          p.passed = true;
          g.score += 1;
        }
      });
      g.pipes = g.pipes.filter(p => p.x + p.width > -10);

      // Update stars
      g.stars.forEach(s => {
        s.x -= PIPE_SPEED;
        s.angle += 0.05;
      });
      g.stars = g.stars.filter(s => s.x > -20 && !s.collected);

      // Update bombs
      g.bombs.forEach(b => {
        b.x -= PIPE_SPEED;
        b.angle += 0.03;
      });
      g.bombs = g.bombs.filter(b => b.x > -20 && !b.hit);

      // Update bullets
      g.bullets.forEach(b => { b.x += b.speed; });
      g.bullets = g.bullets.filter(b => b.x < W + 20);

      // Collision: bird <-> pipes
      for (const p of g.pipes) {
        if (
          g.bird.x + g.bird.radius > p.x &&
          g.bird.x - g.bird.radius < p.x + p.width
        ) {
          if (g.bird.y - g.bird.radius < p.gapY || g.bird.y + g.bird.radius > p.gapY + p.gapHeight) {
            g.lives--;
            if (g.lives <= 0) { endGame(); return; }
            g.bird.y = 250;
            g.bird.vy = 0;
            // Remove the pipe that was hit
            p.passed = true;
            break;
          }
        }
      }

      // Collision: bird <-> stars
      g.stars.forEach(s => {
        if (s.collected) return;
        const dx = g.bird.x - s.x;
        const dy = g.bird.y - s.y;
        if (Math.sqrt(dx * dx + dy * dy) < g.bird.radius + s.radius) {
          s.collected = true;
          g.score += 5;
        }
      });

      // Collision: bird <-> bombs
      g.bombs.forEach(b => {
        if (b.hit) return;
        const dx = g.bird.x - b.x;
        const dy = g.bird.y - b.y;
        if (Math.sqrt(dx * dx + dy * dy) < g.bird.radius + b.radius) {
          b.hit = true;
          g.lives--;
          if (g.lives <= 0) { endGame(); return; }
          g.bird.y = 250;
          g.bird.vy = 0;
        }
      });

      // Collision: bullets <-> bombs (destroy bombs with bullets)
      g.bullets.forEach(bullet => {
        g.bombs.forEach(bomb => {
          if (bomb.hit) return;
          const dx = bullet.x - bomb.x;
          const dy = bullet.y - bomb.y;
          if (Math.sqrt(dx * dx + dy * dy) < bullet.radius + bomb.radius) {
            bomb.hit = true;
            g.score += 3;
          }
        });
      });

      // ===== DRAW =====
      // Background
      ctx.fillStyle = '#0a0e1a';
      ctx.fillRect(0, 0, W, H);

      // Scrolling stars background
      ctx.fillStyle = '#ffffff11';
      for (let i = 0; i < 50; i++) {
        const sx = ((i * 97 + g.frameCount * 0.3) % (W + 20)) - 10;
        const sy = (i * 73) % H;
        ctx.fillRect(sx, sy, 1.5, 1.5);
      }

      // Ground line
      ctx.strokeStyle = '#00ff8844';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, H - 1);
      ctx.lineTo(W, H - 1);
      ctx.stroke();

      // Draw pipes
      g.pipes.forEach(p => drawPipe(ctx, p, H));

      // Draw stars
      g.stars.forEach(s => drawStar(ctx, s));

      // Draw bombs
      g.bombs.forEach(b => drawBomb(ctx, b));

      // Draw bullets
      const enhanced = elapsedSec > 10;
      g.bullets.forEach(b => drawBullet(ctx, b, enhanced));

      // Draw bird
      drawBird(ctx, g.bird, elapsedSec);

      // HUD
      ctx.fillStyle = '#00000088';
      ctx.fillRect(0, 0, W, 40);

      // Timer
      ctx.fillStyle = '#00ffcc';
      ctx.font = '14px "Orbitron", monospace';
      ctx.textAlign = 'left';
      ctx.fillText(formatTime(g.elapsedMs), 10, 27);

      // Score
      ctx.fillStyle = '#ffdd00';
      ctx.textAlign = 'center';
      ctx.fillText(`★ ${g.score}`, W / 2, 27);

      // Lives
      ctx.fillStyle = '#ff4444';
      ctx.textAlign = 'right';
      ctx.fillText('❤'.repeat(g.lives), W - 10, 27);

      // Enhanced mode indicator
      if (enhanced) {
        ctx.fillStyle = '#ff44ff';
        ctx.font = '10px "Orbitron", monospace';
        ctx.textAlign = 'center';
        ctx.fillText('⚡ POWER MODE ⚡', W / 2, H - 10);
      }

      g.animationId = requestAnimationFrame(loop);
    };

    g.animationId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(g.animationId);
  }, [phase, maxTime, onGameEnd]);

  // Input handlers
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'ArrowUp') {
        e.preventDefault();
        if (phase === 'intro') startCountdown();
        else flap();
      }
    };
    const handleTouch = () => {
      if (phase === 'intro') startCountdown();
      else flap();
    };
    window.addEventListener('keydown', handleKey);
    window.addEventListener('touchstart', handleTouch);
    return () => {
      window.removeEventListener('keydown', handleKey);
      window.removeEventListener('touchstart', handleTouch);
    };
  }, [phase, flap, startCountdown]);

  const handleCanvasClick = () => {
    if (phase === 'intro') startCountdown();
    else flap();
  };

  return (
    <div className="relative w-full h-screen flex items-center justify-center bg-background overflow-hidden">
      <canvas
        ref={canvasRef}
        width={400}
        height={600}
        className="border border-border rounded-lg cursor-pointer max-w-full max-h-full"
        onClick={handleCanvasClick}
        style={{ imageRendering: 'pixelated' }}
      />

      {/* Intro Screen */}
      {phase === 'intro' && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/90 z-10">
          <div className="text-center p-8 max-w-sm">
            <h1 className="text-2xl font-arcade text-neon-green mb-6">FLAPPY SHOOTER</h1>
            <div className="text-left text-sm text-foreground/80 space-y-3 mb-8 font-display">
              <p>🐦 <span className="text-neon-yellow">TAP or SPACE</span> to flap and fly</p>
              <p>⭐ Collect <span className="text-neon-yellow">STARS</span> for bonus points</p>
              <p>💣 Avoid <span className="text-neon-pink">BOMBS</span> — you have 3 lives!</p>
              <p>🔫 Your bird <span className="text-neon-green">auto-shoots</span> bullets</p>
              <p>⚡ After 10s, bullets become <span className="text-neon-pink">POWERFUL!</span></p>
              <p>🏁 Dodge pipes and survive as long as you can!</p>
            </div>
            <button
              onClick={startCountdown}
              className="font-arcade text-sm text-primary-foreground bg-primary px-6 py-3 rounded-lg glow-green animate-pulse"
            >
              TAP TO START
            </button>
          </div>
        </div>
      )}

      {/* Countdown */}
      {phase === 'countdown' && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10">
          <span className="text-8xl font-arcade text-neon-green animate-ping">
            {countdown}
          </span>
        </div>
      )}

      {/* Game Over */}
      {phase === 'gameover' && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/85 z-10">
          <div className="text-center">
            <h2 className="text-3xl font-arcade text-neon-pink mb-4">GAME OVER</h2>
            <p className="text-xl font-display text-neon-yellow">
              Score: {gameRef.current.score}
            </p>
            <p className="text-sm font-display text-muted-foreground mt-2">
              {formatTime(gameRef.current.elapsedMs)}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default FlappyBirdGame;
