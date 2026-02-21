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
interface Particle { x: number; y: number; vx: number; vy: number; life: number; color: string; size: number; }

const GRAVITY = 0.45;
const FLAP_FORCE = -7.5;
const BIRD_X = 80;
const STAR_TIME_BONUS = 2000;
const UPGRADE_INTERVAL = 5; // seconds

// Evolution stages
const BIRD_STAGES = [
  { name: 'EGG', color1: '#ffee88', color2: '#ffcc44', size: 12 },
  { name: 'CHICK', color1: '#ffee44', color2: '#ffaa00', size: 14 },
  { name: 'BIRD', color1: '#ff8800', color2: '#ff4400', size: 16 },
  { name: 'EAGLE', color1: '#ff4444', color2: '#cc0000', size: 18 },
  { name: 'PHOENIX', color1: '#ff44ff', color2: '#8800ff', size: 20 },
  { name: 'DRAGON', color1: '#00ffcc', color2: '#0088ff', size: 22 },
  { name: 'GOD BIRD', color1: '#ffffff', color2: '#ffdd00', size: 24 },
];

const FlappyBirdGame: React.FC<GameProps> = ({ onGameEnd, maxTime = 60 }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [phase, setPhase] = useState<GamePhase>('intro');
  const [countdown, setCountdown] = useState(3);
  const gameRef = useRef({
    bird: { x: BIRD_X, y: 250, vy: 0, radius: 14 } as Bird,
    pipes: [] as Pipe[],
    stars: [] as Star[],
    particles: [] as Particle[],
    score: 0,
    frameCount: 0,
    elapsedMs: 0,
    lastTimestamp: 0,
    playing: false,
    animationId: 0,
    pipeTimer: 0,
    lastStage: 0,
    cloudOffsetX: 0,
  });

  const getStage = (sec: number) => Math.min(Math.floor(sec / UPGRADE_INTERVAL), BIRD_STAGES.length - 1);

  const getDifficulty = (sec: number) => {
    const t = Math.min(sec / maxTime, 1);
    return {
      pipeSpeed: 2.0 + t * 4.0,        // 2 → 6
      pipeInterval: Math.max(60, 150 - sec * 1.5), // 150 → 60 frames
      gapHeight: Math.max(70, 140 - sec * 1.2),     // 140 → 70
    };
  };

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
        vx: (Math.random() - 0.5) * 10,
        vy: (Math.random() - 0.5) * 10,
        life: 1,
        color,
        size: Math.random() * 5 + 2,
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
        g.bird = { x: BIRD_X, y: 250, vy: 0, radius: 14 };
        g.pipes = [];
        g.stars = [];
        g.particles = [];
        g.score = 0;
        g.frameCount = 0;
        g.elapsedMs = 0;
        g.pipeTimer = 0;
        g.lastStage = 0;
        g.cloudOffsetX = 0;
      } else {
        setCountdown(count);
        playCountdownBeep();
      }
    }, 1000);
  }, []);

  const drawBackground = (ctx: CanvasRenderingContext2D, W: number, H: number, frameCount: number, stage: number) => {
    // Sky changes with stage
    const skyColors = [
      ['#0b0d2a', '#1a1040', '#0a0e1a'],
      ['#0b0d2a', '#1a1040', '#0a0e1a'],
      ['#0a1a2a', '#102050', '#0a1530'],
      ['#1a0a2a', '#301050', '#1a0530'],
      ['#2a0a1a', '#501030', '#2a0510'],
      ['#0a2a2a', '#103050', '#0a2530'],
      ['#1a1a00', '#303000', '#1a1500'],
    ];
    const colors = skyColors[stage] || skyColors[0];
    const skyGrad = ctx.createLinearGradient(0, 0, 0, H);
    skyGrad.addColorStop(0, colors[0]);
    skyGrad.addColorStop(0.5, colors[1]);
    skyGrad.addColorStop(1, colors[2]);
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, W, H);

    // Stars
    for (let i = 0; i < 60; i++) {
      const sx = ((i * 97 + frameCount * 0.2) % (W + 20)) - 10;
      const sy = (i * 73 + Math.sin(i + frameCount * 0.02) * 3) % (H * 0.7);
      const brightness = 0.3 + Math.sin(frameCount * 0.05 + i) * 0.2;
      ctx.fillStyle = `rgba(255, 255, 255, ${brightness})`;
      ctx.fillRect(sx, sy, (i % 3 === 0) ? 2.5 : 1.5, (i % 3 === 0) ? 2.5 : 1.5);
    }

    // Ground
    const groundGrad = ctx.createLinearGradient(0, H - 30, 0, H);
    groundGrad.addColorStop(0, '#1a4a20');
    groundGrad.addColorStop(1, '#060f08');
    ctx.fillStyle = groundGrad;
    ctx.fillRect(0, H - 30, W, 30);

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

  const drawBird = (ctx: CanvasRenderingContext2D, bird: Bird, elapsedSec: number, stage: number) => {
    const stageInfo = BIRD_STAGES[stage];
    ctx.save();
    const angle = Math.min(Math.max(bird.vy * 0.04, -0.5), 0.8);
    ctx.translate(bird.x, bird.y);
    ctx.rotate(angle);

    const r = stageInfo.size;
    ctx.shadowColor = stageInfo.color1;
    ctx.shadowBlur = 15 + stage * 5;

    // Body
    const grad = ctx.createRadialGradient(0, 0, 2, 0, 0, r);
    grad.addColorStop(0, stageInfo.color1);
    grad.addColorStop(0.6, stageInfo.color2);
    grad.addColorStop(1, stageInfo.color2 + '88');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.ellipse(0, 0, r + 2, r, 0, 0, Math.PI * 2);
    ctx.fill();

    // Eye
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.ellipse(r * 0.35, -r * 0.25, r * 0.28, r * 0.3, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#111';
    ctx.beginPath();
    ctx.arc(r * 0.4, -r * 0.25, r * 0.15, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(r * 0.45, -r * 0.32, r * 0.06, 0, Math.PI * 2);
    ctx.fill();

    // Beak
    ctx.fillStyle = stage >= 4 ? '#ff00ff' : '#ff3300';
    ctx.beginPath();
    ctx.moveTo(r, 0);
    ctx.lineTo(r + 8 + stage * 2, 2);
    ctx.lineTo(r + 8 + stage * 2, 5);
    ctx.lineTo(r, 6);
    ctx.closePath();
    ctx.fill();

    // Wing
    const wingFlap = Math.sin(elapsedSec * 14) * 0.4;
    ctx.fillStyle = stageInfo.color2;
    ctx.beginPath();
    ctx.ellipse(-4, 2, r * 0.7, r * 0.4, wingFlap, 0, Math.PI * 2);
    ctx.fill();

    // Stage-specific decorations
    if (stage >= 3) {
      // Crown/spikes
      ctx.fillStyle = stageInfo.color1;
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.moveTo(-5 + i * 5, -r);
        ctx.lineTo(-3 + i * 5, -r - 6 - stage);
        ctx.lineTo(-1 + i * 5, -r);
        ctx.fill();
      }
    }
    if (stage >= 5) {
      // Flame trail
      ctx.globalAlpha = 0.6;
      for (let i = 0; i < 5; i++) {
        const fx = -r - 5 - i * 6;
        const fy = Math.sin(elapsedSec * 20 + i) * 4;
        ctx.fillStyle = i % 2 === 0 ? stageInfo.color1 : stageInfo.color2;
        ctx.beginPath();
        ctx.ellipse(fx, fy, 5 - i * 0.5, 3, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }
    if (stage >= 6) {
      // Halo
      ctx.strokeStyle = '#ffdd0088';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(0, -r - 8, 10, 4, 0, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.restore();
  };

  const drawPipe = (ctx: CanvasRenderingContext2D, pipe: Pipe, H: number, stage: number) => {
    const pipeColors = [
      ['#1a8a40', '#22cc55', '#33ee66'],
      ['#1a8a40', '#22cc55', '#33ee66'],
      ['#2a6a8a', '#33aacc', '#44ccee'],
      ['#6a2a8a', '#aa33cc', '#cc44ee'],
      ['#8a2a2a', '#cc3333', '#ee4444'],
      ['#2a8a6a', '#33ccaa', '#44eecc'],
      ['#8a8a2a', '#cccc33', '#eeee44'],
    ];
    const pc = pipeColors[stage] || pipeColors[0];

    const gradient1 = ctx.createLinearGradient(pipe.x, 0, pipe.x + pipe.width, 0);
    gradient1.addColorStop(0, pc[0]);
    gradient1.addColorStop(0.5, pc[2]);
    gradient1.addColorStop(1, pc[0]);

    // Top pipe
    ctx.fillStyle = gradient1;
    ctx.fillRect(pipe.x, 0, pipe.width, pipe.gapY);
    const capGrad = ctx.createLinearGradient(pipe.x - 5, 0, pipe.x + pipe.width + 5, 0);
    capGrad.addColorStop(0, pc[0]);
    capGrad.addColorStop(0.5, pc[2]);
    capGrad.addColorStop(1, pc[0]);
    ctx.fillStyle = capGrad;
    ctx.fillRect(pipe.x - 5, pipe.gapY - 18, pipe.width + 10, 18);

    // Bottom pipe
    const bottomY = pipe.gapY + pipe.gapHeight;
    ctx.fillStyle = gradient1;
    ctx.fillRect(pipe.x, bottomY, pipe.width, H - 30 - bottomY);
    ctx.fillStyle = capGrad;
    ctx.fillRect(pipe.x - 5, bottomY, pipe.width + 10, 18);

    // Highlight
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    ctx.fillRect(pipe.x + 8, 0, 6, pipe.gapY);
    ctx.fillRect(pipe.x + 8, bottomY, 6, H - 30 - bottomY);
  };

  const drawStar = (ctx: CanvasRenderingContext2D, star: Star) => {
    if (star.collected) return;
    ctx.save();
    ctx.translate(star.x, star.y);
    ctx.rotate(star.angle);
    ctx.shadowColor = '#ffdd00';
    ctx.shadowBlur = 20;
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
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(0, 0, star.radius * 0.25, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#00ffcc';
    ctx.font = 'bold 8px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('-2s', 0, star.radius + 12);
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

  const drawHUD = (ctx: CanvasRenderingContext2D, W: number, g: typeof gameRef.current, stage: number) => {
    ctx.fillStyle = '#00000099';
    ctx.fillRect(0, 0, W, 44);

    ctx.fillStyle = '#00ffcc';
    ctx.font = 'bold 15px "Orbitron", monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`⏱ ${formatTime(g.elapsedMs)}`, 10, 29);

    ctx.fillStyle = '#ffdd00';
    ctx.textAlign = 'center';
    ctx.font = 'bold 16px "Orbitron", monospace';
    ctx.fillText(`★ ${g.score}`, W / 2, 29);

    // Stage name
    ctx.textAlign = 'right';
    ctx.fillStyle = BIRD_STAGES[stage].color1;
    ctx.font = 'bold 11px "Orbitron", monospace';
    ctx.fillText(BIRD_STAGES[stage].name, W - 10, 29);
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

      const stage = getStage(elapsedSec);
      const diff = getDifficulty(elapsedSec);

      // Stage upgrade sound
      if (stage > g.lastStage) {
        g.lastStage = stage;
        playPowerUpSound();
        spawnParticles(g.bird.x, g.bird.y, BIRD_STAGES[stage].color1, 30);
        g.bird.radius = BIRD_STAGES[stage].size;
      }

      // Physics
      g.bird.vy += GRAVITY;
      g.bird.y += g.bird.vy;

      // Ceiling
      if (g.bird.y - g.bird.radius < 0) {
        g.bird.y = g.bird.radius;
        g.bird.vy = 0;
      }
      // Floor - just sit on ground, no death
      if (g.bird.y + g.bird.radius > H - 30) {
        g.bird.y = H - 30 - g.bird.radius;
        g.bird.vy = 0;
      }

      // Generate pipes
      g.pipeTimer++;
      if (g.pipeTimer >= diff.pipeInterval) {
        g.pipeTimer = 0;
        const gapH = diff.gapHeight;
        const gapY = Math.random() * (H - 30 - gapH - 80) + 40;
        g.pipes.push({ x: W, gapY, gapHeight: gapH, width: 50, passed: false });

        if (Math.random() < 0.5) {
          g.stars.push({
            x: W + 25,
            y: gapY + gapH / 2,
            radius: 10,
            collected: false,
            angle: 0,
          });
        }
      }

      // Update pipes
      g.pipes.forEach(p => {
        p.x -= diff.pipeSpeed;
        if (!p.passed && p.x + p.width < g.bird.x) {
          p.passed = true;
          g.score += 1;
          playScoreSound();
          spawnParticles(g.bird.x, g.bird.y, '#00ff88', 8);
        }
      });
      g.pipes = g.pipes.filter(p => p.x + p.width > -10);

      // Update stars
      g.stars.forEach(s => { s.x -= diff.pipeSpeed; s.angle += 0.05; });
      g.stars = g.stars.filter(s => s.x > -20 && !s.collected);

      // Update particles
      g.particles.forEach(p => { p.x += p.vx; p.y += p.vy; p.life -= 0.03; });
      g.particles = g.particles.filter(p => p.life > 0);

      // Collision: bird <-> pipes → game over
      for (const p of g.pipes) {
        if (g.bird.x + g.bird.radius > p.x && g.bird.x - g.bird.radius < p.x + p.width) {
          if (g.bird.y - g.bird.radius < p.gapY || g.bird.y + g.bird.radius > p.gapY + p.gapHeight) {
            playHitSound();
            spawnParticles(g.bird.x, g.bird.y, '#ff4444', 20);
            endGame();
            return;
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
          g.elapsedMs = Math.max(0, g.elapsedMs - STAR_TIME_BONUS);
          g.score += 5;
          playStarSound();
          spawnParticles(s.x, s.y, '#ffee44', 20);
        }
      });

      // ===== DRAW =====
      drawBackground(ctx, W, H, g.frameCount, stage);
      g.pipes.forEach(p => drawPipe(ctx, p, H, stage));
      g.stars.forEach(s => drawStar(ctx, s));
      drawBird(ctx, g.bird, elapsedSec, stage);
      drawParticles(ctx, g.particles);
      drawHUD(ctx, W, g, stage);

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

  return (
    <div className="relative w-full h-screen flex items-center justify-center bg-background overflow-hidden">
      <canvas
        ref={canvasRef}
        width={400}
        height={600}
        className="border border-border rounded-lg cursor-pointer max-w-full max-h-full"
        onClick={() => { if (phase === 'intro') startCountdown(); else flap(); }}
        style={{ imageRendering: 'pixelated' }}
      />

      {phase === 'intro' && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/90 z-10">
          <div className="text-center p-8 max-w-sm">
            <h1 className="text-2xl font-arcade text-neon-green mb-6">FLAPPY EVOLUTION</h1>
            <div className="text-left text-sm text-foreground/80 space-y-3 mb-8 font-display">
              <p>🐦 <span className="text-neon-yellow">TAP or SPACE</span> to flap and fly</p>
              <p>⭐ Collect <span className="text-neon-yellow">STARS</span> to reduce time by 2s!</p>
              <p>🔥 Every 5s your bird <span className="text-neon-pink">EVOLVES!</span></p>
              <p>💀 Hit a pipe = <span className="text-neon-pink">GAME OVER!</span></p>
              <p>📈 Speed & difficulty increase over time!</p>
              <p>🏁 Survive as long as you can!</p>
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
          <span className="text-8xl font-arcade text-neon-green animate-ping">{countdown}</span>
        </div>
      )}

      {phase === 'gameover' && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/85 z-10">
          <div className="text-center">
            <h2 className="text-3xl font-arcade text-neon-pink mb-4">GAME OVER</h2>
            <p className="text-xl font-display text-neon-yellow">Score: {gameRef.current.score}</p>
            <p className="text-sm font-display text-muted-foreground mt-2">
              Stage: {BIRD_STAGES[getStage(gameRef.current.elapsedMs / 1000)].name}
            </p>
            <p className="text-sm font-display text-muted-foreground mt-1">
              {formatTime(gameRef.current.elapsedMs)}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default FlappyBirdGame;
