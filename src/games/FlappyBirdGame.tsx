import React, { useRef, useEffect, useCallback, useState } from 'react';
import {
  playFlapSound, playScoreSound, playStarSound,
  playHitSound, playGameOverSound, playCountdownBeep, playPowerUpSound,
} from './sounds';

interface GameProps {
  onGameEnd: (score: number) => void;
  maxTime?: number;
}

type GamePhase = 'intro' | 'countdown' | 'playing' | 'gameover';

interface Bird { x: number; y: number; vy: number; radius: number; }
interface Pipe { x: number; gapY: number; gapHeight: number; width: number; passed: boolean; }
interface Star { x: number; y: number; radius: number; collected: boolean; angle: number; }
interface Bullet { x: number; y: number; radius: number; speed: number; }
interface Particle { x: number; y: number; vx: number; vy: number; life: number; color: string; size: number; }

const GRAVITY = 0.45;
const FLAP_FORCE = -7.5;
const PIPE_SPEED = 2.5;
const PIPE_INTERVAL = 150;
const BIRD_X = 80;
const STAR_TIME_BONUS = 2000; // 2 seconds off timer

const FlappyBirdGame: React.FC<GameProps> = ({ onGameEnd, maxTime = 60 }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [phase, setPhase] = useState<GamePhase>('intro');
  const [countdown, setCountdown] = useState(3);
  const gameRef = useRef({
    bird: { x: BIRD_X, y: 250, vy: 0, radius: 15 } as Bird,
    pipes: [] as Pipe[],
    stars: [] as Star[],
    bullets: [] as Bullet[],
    particles: [] as Particle[],
    score: 0,
    lives: 3,
    frameCount: 0,
    elapsedMs: 0,
    lastTimestamp: 0,
    playing: false,
    autoShootTimer: 0,
    animationId: 0,
    pipeTimer: 0,
    powerUpTriggered: false,
    cloudOffsetX: 0,
  });

  const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
    const seconds = (totalSeconds % 60).toString().padStart(2, '0');
    const centiseconds = Math.floor((ms % 1000) / 10).toString().padStart(2, '0');
    return `${minutes}:${seconds}:${centiseconds}`;
  };

  const spawnParticles = (x: number, y: number, color: string, count: number) => {
    const g = gameRef.current;
    for (let i = 0; i < count; i++) {
      g.particles.push({
        x, y,
        vx: (Math.random() - 0.5) * 8,
        vy: (Math.random() - 0.5) * 8,
        life: 1,
        color,
        size: Math.random() * 4 + 2,
      });
    }
  };

  const flap = useCallback(() => {
    if (phase === 'playing' && gameRef.current.playing) {
      gameRef.current.bird.vy = FLAP_FORCE;
      playFlapSound();
    }
  }, [phase]);

  const startCountdown = useCallback(() => {
    setPhase('countdown');
    setCountdown(3);
    playCountdownBeep();
    let count = 3;
    const interval = setInterval(() => {
      count--;
      if (count <= 0) {
        clearInterval(interval);
        playCountdownBeep(true);
        setPhase('playing');
        const g = gameRef.current;
        g.playing = true;
        g.lastTimestamp = performance.now();
        g.bird = { x: BIRD_X, y: 250, vy: 0, radius: 15 };
        g.pipes = [];
        g.stars = [];
        g.bullets = [];
        g.particles = [];
        g.score = 0;
        g.lives = 3;
        g.frameCount = 0;
        g.elapsedMs = 0;
        g.pipeTimer = 0;
        g.autoShootTimer = 0;
        g.powerUpTriggered = false;
        g.cloudOffsetX = 0;
      } else {
        setCountdown(count);
        playCountdownBeep();
      }
    }, 1000);
  }, []);

  // Drawing helpers
  const drawBackground = (ctx: CanvasRenderingContext2D, W: number, H: number, frameCount: number) => {
    // Sky gradient
    const skyGrad = ctx.createLinearGradient(0, 0, 0, H);
    skyGrad.addColorStop(0, '#0b0d2a');
    skyGrad.addColorStop(0.4, '#1a1040');
    skyGrad.addColorStop(0.7, '#2a1555');
    skyGrad.addColorStop(1, '#0a0e1a');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, W, H);

    // Twinkling stars background
    for (let i = 0; i < 60; i++) {
      const sx = ((i * 97 + frameCount * 0.2) % (W + 20)) - 10;
      const sy = (i * 73 + Math.sin(i + frameCount * 0.02) * 3) % (H * 0.7);
      const brightness = 0.3 + Math.sin(frameCount * 0.05 + i) * 0.2;
      ctx.fillStyle = `rgba(255, 255, 255, ${brightness})`;
      const starSize = (i % 3 === 0) ? 2.5 : 1.5;
      ctx.fillRect(sx, sy, starSize, starSize);
    }

    // Scrolling clouds
    const cloudX = gameRef.current.cloudOffsetX;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.03)';
    for (let i = 0; i < 4; i++) {
      const cx = ((i * 130 + cloudX) % (W + 100)) - 50;
      const cy = 60 + i * 80;
      ctx.beginPath();
      ctx.ellipse(cx, cy, 40 + i * 10, 15, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(cx + 25, cy - 5, 30, 12, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // Ground with grass effect
    const groundGrad = ctx.createLinearGradient(0, H - 30, 0, H);
    groundGrad.addColorStop(0, '#1a4a20');
    groundGrad.addColorStop(0.3, '#0d3010');
    groundGrad.addColorStop(1, '#060f08');
    ctx.fillStyle = groundGrad;
    ctx.fillRect(0, H - 30, W, 30);

    // Grass blades
    ctx.strokeStyle = '#2a7a30';
    ctx.lineWidth = 1;
    for (let i = 0; i < W; i += 6) {
      const grassH = 5 + Math.sin(i * 0.3 + frameCount * 0.1) * 3;
      ctx.beginPath();
      ctx.moveTo(i, H - 30);
      ctx.lineTo(i + 2, H - 30 - grassH);
      ctx.stroke();
    }
  };

  const drawBird = (ctx: CanvasRenderingContext2D, bird: Bird, elapsedSec: number) => {
    ctx.save();
    // Rotation based on velocity
    const angle = Math.min(Math.max(bird.vy * 0.04, -0.5), 0.8);
    ctx.translate(bird.x, bird.y);
    ctx.rotate(angle);

    // Body glow
    ctx.shadowColor = '#ff8800';
    ctx.shadowBlur = 20;

    // Body
    const grad = ctx.createRadialGradient(0, 0, 2, 0, 0, bird.radius);
    grad.addColorStop(0, '#ffee44');
    grad.addColorStop(0.5, '#ffaa00');
    grad.addColorStop(1, '#ff6600');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.ellipse(0, 0, bird.radius + 2, bird.radius, 0, 0, Math.PI * 2);
    ctx.fill();

    // Belly
    ctx.fillStyle = '#ffdd88';
    ctx.beginPath();
    ctx.ellipse(0, 3, bird.radius * 0.6, bird.radius * 0.5, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.shadowBlur = 0;

    // Eye (white)
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.ellipse(6, -4, 5, 5.5, 0, 0, Math.PI * 2);
    ctx.fill();
    // Pupil
    ctx.fillStyle = '#111';
    ctx.beginPath();
    ctx.arc(7, -4, 2.5, 0, Math.PI * 2);
    ctx.fill();
    // Eye shine
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(8, -5, 1, 0, Math.PI * 2);
    ctx.fill();

    // Beak
    ctx.fillStyle = '#ff3300';
    ctx.beginPath();
    ctx.moveTo(bird.radius - 2, 0);
    ctx.lineTo(bird.radius + 10, 2);
    ctx.lineTo(bird.radius + 10, 5);
    ctx.lineTo(bird.radius - 2, 6);
    ctx.closePath();
    ctx.fill();

    // Wing
    const wingFlap = Math.sin(elapsedSec * 14) * 0.4;
    ctx.fillStyle = '#ff9900';
    ctx.beginPath();
    ctx.ellipse(-4, 2, 11, 6, wingFlap, 0, Math.PI * 2);
    ctx.fill();

    // Tail feathers
    ctx.fillStyle = '#ff7700';
    ctx.beginPath();
    ctx.moveTo(-bird.radius + 2, -2);
    ctx.lineTo(-bird.radius - 8, -6);
    ctx.lineTo(-bird.radius - 6, 0);
    ctx.lineTo(-bird.radius - 8, 6);
    ctx.lineTo(-bird.radius + 2, 3);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  };

  const drawPipe = (ctx: CanvasRenderingContext2D, pipe: Pipe, H: number) => {
    // Pipe body gradient - more colorful
    const gradient1 = ctx.createLinearGradient(pipe.x, 0, pipe.x + pipe.width, 0);
    gradient1.addColorStop(0, '#1a8a40');
    gradient1.addColorStop(0.3, '#22cc55');
    gradient1.addColorStop(0.5, '#33ee66');
    gradient1.addColorStop(0.7, '#22cc55');
    gradient1.addColorStop(1, '#1a8a40');

    // Top pipe
    ctx.fillStyle = gradient1;
    ctx.fillRect(pipe.x, 0, pipe.width, pipe.gapY);

    // Pipe cap top
    const capGrad = ctx.createLinearGradient(pipe.x - 5, 0, pipe.x + pipe.width + 5, 0);
    capGrad.addColorStop(0, '#15aa35');
    capGrad.addColorStop(0.5, '#44ff77');
    capGrad.addColorStop(1, '#15aa35');
    ctx.fillStyle = capGrad;
    ctx.fillRect(pipe.x - 5, pipe.gapY - 18, pipe.width + 10, 18);
    ctx.strokeStyle = '#0a6620';
    ctx.lineWidth = 1;
    ctx.strokeRect(pipe.x - 5, pipe.gapY - 18, pipe.width + 10, 18);

    // Bottom pipe
    const bottomY = pipe.gapY + pipe.gapHeight;
    ctx.fillStyle = gradient1;
    ctx.fillRect(pipe.x, bottomY, pipe.width, H - 30 - bottomY);

    // Pipe cap bottom
    ctx.fillStyle = capGrad;
    ctx.fillRect(pipe.x - 5, bottomY, pipe.width + 10, 18);
    ctx.strokeRect(pipe.x - 5, bottomY, pipe.width + 10, 18);

    // Highlight stripe
    ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.fillRect(pipe.x + 8, 0, 6, pipe.gapY);
    ctx.fillRect(pipe.x + 8, bottomY, 6, H - 30 - bottomY);

    // Glow
    ctx.shadowColor = '#00ff88';
    ctx.shadowBlur = 6;
    ctx.strokeStyle = '#00ff8833';
    ctx.lineWidth = 1;
    ctx.strokeRect(pipe.x, 0, pipe.width, pipe.gapY);
    ctx.strokeRect(pipe.x, bottomY, pipe.width, H - 30 - bottomY);
    ctx.shadowBlur = 0;
  };

  const drawStar = (ctx: CanvasRenderingContext2D, star: Star) => {
    if (star.collected) return;
    ctx.save();
    ctx.translate(star.x, star.y);
    ctx.rotate(star.angle);

    // Outer glow
    ctx.shadowColor = '#ffdd00';
    ctx.shadowBlur = 20;

    // Star shape
    ctx.fillStyle = '#ffee44';
    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
      const a = (i * 4 * Math.PI) / 5 - Math.PI / 2;
      ctx.lineTo(Math.cos(a) * star.radius, Math.sin(a) * star.radius);
      const innerA = a + (2 * Math.PI) / 10;
      ctx.lineTo(Math.cos(innerA) * (star.radius * 0.4), Math.sin(innerA) * (star.radius * 0.4));
    }
    ctx.closePath();
    ctx.fill();

    // Inner bright center
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(0, 0, star.radius * 0.25, 0, Math.PI * 2);
    ctx.fill();

    // Time bonus indicator
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#00ffcc';
    ctx.font = 'bold 8px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('-2s', 0, star.radius + 12);

    ctx.restore();
  };

  const drawBullet = (ctx: CanvasRenderingContext2D, bullet: Bullet, enhanced: boolean) => {
    ctx.save();
    if (enhanced) {
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
      ctx.ellipse(bullet.x - 12, bullet.y, 18, bullet.radius * 0.6, 0, 0, Math.PI * 2);
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

  const drawParticles = (ctx: CanvasRenderingContext2D, particles: Particle[]) => {
    particles.forEach(p => {
      ctx.globalAlpha = p.life;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalAlpha = 1;
  };

  const drawHUD = (ctx: CanvasRenderingContext2D, W: number, g: typeof gameRef.current, enhanced: boolean) => {
    // HUD background
    ctx.fillStyle = '#00000099';
    ctx.fillRect(0, 0, W, 44);
    ctx.fillStyle = '#00000033';
    ctx.fillRect(0, 44, W, 2);

    // Timer
    ctx.fillStyle = '#00ffcc';
    ctx.font = 'bold 15px "Orbitron", monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`⏱ ${formatTime(g.elapsedMs)}`, 10, 29);

    // Score
    ctx.fillStyle = '#ffdd00';
    ctx.textAlign = 'center';
    ctx.font = 'bold 16px "Orbitron", monospace';
    ctx.fillText(`★ ${g.score}`, W / 2, 29);

    // Lives
    ctx.textAlign = 'right';
    ctx.font = '14px sans-serif';
    for (let i = 0; i < g.lives; i++) {
      ctx.fillStyle = '#ff4444';
      ctx.fillText('❤️', W - 10 - i * 22, 30);
    }

    // Power mode
    if (enhanced) {
      ctx.fillStyle = '#ff44ff';
      ctx.font = 'bold 10px "Orbitron", monospace';
      ctx.textAlign = 'center';
      ctx.fillText('⚡ POWER MODE ⚡', W / 2, 58);
    }
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
      playGameOverSound();
      setPhase('gameover');
      setTimeout(() => onGameEnd(g.score), 1500);
    };

    const loop = (timestamp: number) => {
      if (!g.playing) return;

      const dt = timestamp - g.lastTimestamp;
      g.lastTimestamp = timestamp;
      g.elapsedMs += dt;
      g.frameCount++;
      g.cloudOffsetX -= 0.3;

      const elapsedSec = g.elapsedMs / 1000;

      if (elapsedSec >= maxTime) { endGame(); return; }

      // Power up trigger
      if (!g.powerUpTriggered && elapsedSec > 10) {
        g.powerUpTriggered = true;
        playPowerUpSound();
      }

      // Physics
      g.bird.vy += GRAVITY;
      g.bird.y += g.bird.vy;

      if (g.bird.y - g.bird.radius < 0) {
        g.bird.y = g.bird.radius;
        g.bird.vy = 0;
      }
      if (g.bird.y + g.bird.radius > H - 30) {
        g.lives--;
        playHitSound();
        spawnParticles(g.bird.x, g.bird.y, '#ff4444', 15);
        if (g.lives <= 0) { endGame(); return; }
        g.bird.y = 250;
        g.bird.vy = 0;
      }

      // Generate pipes
      g.pipeTimer++;
      if (g.pipeTimer >= PIPE_INTERVAL) {
        g.pipeTimer = 0;
        const gapH = 130 - Math.min(elapsedSec * 0.5, 30);
        const gapY = Math.random() * (H - 30 - gapH - 100) + 50;
        g.pipes.push({ x: W, gapY, gapHeight: Math.max(gapH, 90), width: 50, passed: false });

        if (Math.random() < 0.6) {
          g.stars.push({
            x: W + 25,
            y: gapY + Math.max(gapH, 90) / 2,
            radius: 10,
            collected: false,
            angle: 0,
          });
        }
      }

      // Auto shoot
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
          playScoreSound();
          spawnParticles(g.bird.x, g.bird.y, '#00ff88', 8);
        }
      });
      g.pipes = g.pipes.filter(p => p.x + p.width > -10);

      // Update stars
      g.stars.forEach(s => { s.x -= PIPE_SPEED; s.angle += 0.05; });
      g.stars = g.stars.filter(s => s.x > -20 && !s.collected);

      // Update bullets
      g.bullets.forEach(b => { b.x += b.speed; });
      g.bullets = g.bullets.filter(b => b.x < W + 20);

      // Update particles
      g.particles.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.life -= 0.03;
      });
      g.particles = g.particles.filter(p => p.life > 0);

      // Collision: bird <-> pipes
      for (const p of g.pipes) {
        if (g.bird.x + g.bird.radius > p.x && g.bird.x - g.bird.radius < p.x + p.width) {
          if (g.bird.y - g.bird.radius < p.gapY || g.bird.y + g.bird.radius > p.gapY + p.gapHeight) {
            g.lives--;
            playHitSound();
            spawnParticles(g.bird.x, g.bird.y, '#ff4444', 15);
            if (g.lives <= 0) { endGame(); return; }
            g.bird.y = 250;
            g.bird.vy = 0;
            p.passed = true;
            break;
          }
        }
      }

      // Collision: bird <-> stars → reduce time
      g.stars.forEach(s => {
        if (s.collected) return;
        const dx = g.bird.x - s.x;
        const dy = g.bird.y - s.y;
        if (Math.sqrt(dx * dx + dy * dy) < g.bird.radius + s.radius) {
          s.collected = true;
          g.elapsedMs = Math.max(0, g.elapsedMs - STAR_TIME_BONUS);
          g.score += 5;
          playStarSound();
          spawnParticles(s.x, s.y, '#ffee44', 20);
        }
      });

      // ===== DRAW =====
      drawBackground(ctx, W, H, g.frameCount);
      g.pipes.forEach(p => drawPipe(ctx, p, H));
      g.stars.forEach(s => drawStar(ctx, s));

      const enhanced = elapsedSec > 10;
      g.bullets.forEach(b => drawBullet(ctx, b, enhanced));
      drawBird(ctx, g.bird, elapsedSec);
      drawParticles(ctx, g.particles);
      drawHUD(ctx, W, g, enhanced);

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

      {phase === 'intro' && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/90 z-10">
          <div className="text-center p-8 max-w-sm">
            <h1 className="text-2xl font-arcade text-neon-green mb-6">FLAPPY SHOOTER</h1>
            <div className="text-left text-sm text-foreground/80 space-y-3 mb-8 font-display">
              <p>🐦 <span className="text-neon-yellow">TAP or SPACE</span> to flap and fly</p>
              <p>⭐ Collect <span className="text-neon-yellow">STARS</span> to reduce your time by 2s!</p>
              <p>🔫 Your bird <span className="text-neon-green">auto-shoots</span> bullets</p>
              <p>⚡ After 10s, bullets become <span className="text-neon-pink">POWERFUL!</span></p>
              <p>❤️ You have <span className="text-neon-pink">3 lives</span> — don't hit pipes!</p>
              <p>🏁 Dodge pipes and get the <span className="text-neon-green">lowest time!</span></p>
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

      {phase === 'countdown' && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10">
          <span className="text-8xl font-arcade text-neon-green animate-ping">
            {countdown}
          </span>
        </div>
      )}

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
