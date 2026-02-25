import React, { useRef, useEffect, useCallback, useState } from 'react';
import {
  playFlapSound, playScoreSound, playStarSound,
  playHitSound, playGameOverSound, playCountdownBeep, playEvolutionSound,
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

const GRAVITY = 0.28;
const FLAP_FORCE = -6.0;
const BIRD_X = 80;
const STAR_TIME_BONUS = 2000;
const PIPES_PER_EVOLUTION = 2;

const BIRD_STAGES = [
  { name: 'CHICK',   color1: '#ffee44', color2: '#ffaa00', size: 13, glowSize: 10 },
  { name: 'SPARROW', color1: '#88ccff', color2: '#4488dd', size: 14, glowSize: 14 },
  { name: 'HAWK',    color1: '#ff8844', color2: '#cc4400', size: 15, glowSize: 16 },
  { name: 'EAGLE',   color1: '#dddddd', color2: '#888888', size: 16, glowSize: 18 },
  { name: 'PHOENIX', color1: '#ff4444', color2: '#ff8800', size: 17, glowSize: 22 },
  { name: 'DRAGON',  color1: '#44ffaa', color2: '#0088ff', size: 18, glowSize: 26 },
  { name: 'GOD',     color1: '#ffffff', color2: '#ffdd00', size: 19, glowSize: 30 },
];

const FlappyBirdGame: React.FC<GameProps> = ({ onGameEnd, maxTime = 60 }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [phase, setPhase] = useState<GamePhase>('intro');
  const [countdown, setCountdown] = useState(3);
  const gameRef = useRef({
    bird: { x: BIRD_X, y: 250, vy: 0, radius: 13 } as Bird,
    pipes: [] as Pipe[],
    stars: [] as Star[],
    particles: [] as Particle[],
    score: 0,
    pipesPassed: 0,
    stage: 0,
    frameCount: 0,
    elapsedMs: 0,
    lastTimestamp: 0,
    playing: false,
    animationId: 0,
    pipeTimer: 100,
    cloudOffsetX: 0,
    comboCount: 0,
    scorePopText: '',
    scorePopTimer: 0,
    evolveFlashTimer: 0,
    introAnimFrame: 0,
  });

  const getDifficulty = (sec: number) => {
    const t = Math.min(sec / maxTime, 1);
    return {
      pipeSpeed: 2.0 + t * 4.5,
      pipeInterval: Math.max(55, 120 - sec * 1.8),
      gapHeight: Math.max(68, 140 - sec * 1.5),
    };
  };

  const formatTime = (ms: number) => {
    const s = Math.floor(ms / 1000);
    return `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}:${Math.floor((ms % 1000) / 10).toString().padStart(2, '0')}`;
  };

  const spawnParticles = (x: number, y: number, color: string, count: number) => {
    const g = gameRef.current;
    for (let i = 0; i < count; i++) {
      g.particles.push({ x, y, vx: (Math.random() - 0.5) * 10, vy: (Math.random() - 0.5) * 10, life: 1, color, size: Math.random() * 5 + 2 });
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
        g.bird = { x: BIRD_X, y: 250, vy: 0, radius: 13 };
        g.pipes = []; g.stars = []; g.particles = [];
        g.score = 0; g.pipesPassed = 0; g.stage = 0;
        g.frameCount = 0; g.elapsedMs = 0; g.pipeTimer = 100;
        g.cloudOffsetX = 0; g.comboCount = 0;
        g.scorePopText = ''; g.scorePopTimer = 0; g.evolveFlashTimer = 0;
      } else { setCountdown(count); playCountdownBeep(); }
    }, 1000);
  }, []);

  // ===== DRAWING =====

  const drawBird = (ctx: CanvasRenderingContext2D, bird: Bird, elapsedSec: number, stage: number) => {
    const info = BIRD_STAGES[stage];
    ctx.save();
    const angle = Math.min(Math.max(bird.vy * 0.04, -0.5), 0.8);
    ctx.translate(bird.x, bird.y);
    ctx.rotate(angle);
    const r = info.size;

    ctx.shadowColor = info.color1;
    ctx.shadowBlur = info.glowSize;

    // Body
    const grad = ctx.createRadialGradient(0, 0, 2, 0, 0, r);
    grad.addColorStop(0, info.color1);
    grad.addColorStop(0.7, info.color2);
    grad.addColorStop(1, info.color2 + '66');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.ellipse(0, 0, r + 2, r, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Belly
    ctx.fillStyle = info.color1 + '44';
    ctx.beginPath();
    ctx.ellipse(0, r * 0.2, r * 0.5, r * 0.4, 0, 0, Math.PI * 2);
    ctx.fill();

    // Eye
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.ellipse(r * 0.35, -r * 0.25, r * 0.3, r * 0.32, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = stage >= 4 ? '#ff0000' : '#111';
    ctx.beginPath();
    ctx.arc(r * 0.42, -r * 0.25, r * 0.16, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(r * 0.47, -r * 0.33, r * 0.06, 0, Math.PI * 2);
    ctx.fill();

    // Beak - gets fiercer with stage
    const beakLen = 8 + stage * 3;
    ctx.fillStyle = stage >= 4 ? '#ff2200' : '#ff6600';
    ctx.beginPath();
    ctx.moveTo(r, -1);
    ctx.lineTo(r + beakLen, 2);
    ctx.lineTo(r + beakLen, 5);
    ctx.lineTo(r, 7);
    ctx.closePath();
    ctx.fill();
    if (stage >= 3) {
      // Sharp beak teeth
      ctx.fillStyle = '#fff';
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.moveTo(r + 3 + i * 4, 5);
        ctx.lineTo(r + 5 + i * 4, 8);
        ctx.lineTo(r + 7 + i * 4, 5);
        ctx.fill();
      }
    }

    // Wing
    const wingFlap = Math.sin(elapsedSec * 14) * 0.4;
    ctx.fillStyle = info.color2;
    ctx.beginPath();
    ctx.ellipse(-3, 2, r * 0.75, r * 0.4, wingFlap, 0, Math.PI * 2);
    ctx.fill();

    // Stage-specific features
    if (stage >= 2) {
      // Crest/mohawk
      ctx.fillStyle = info.color1;
      const spikes = stage >= 5 ? 5 : 3;
      for (let i = 0; i < spikes; i++) {
        ctx.beginPath();
        ctx.moveTo(-4 + i * 4, -r);
        ctx.lineTo(-2 + i * 4, -r - 5 - stage * 2);
        ctx.lineTo(0 + i * 4, -r);
        ctx.fill();
      }
    }
    if (stage >= 4) {
      // Phoenix/Dragon flame trail
      ctx.globalAlpha = 0.7;
      for (let i = 0; i < 6 + stage; i++) {
        const fx = -r - 4 - i * 5;
        const fy = Math.sin(elapsedSec * 25 + i * 0.8) * (3 + i * 0.5);
        const flameR = (6 - i * 0.4);
        if (flameR <= 0) continue;
        ctx.fillStyle = i % 2 === 0 ? info.color1 : info.color2;
        ctx.beginPath();
        ctx.ellipse(fx, fy, flameR, flameR * 0.6, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }
    if (stage >= 5) {
      // Dragon horns
      ctx.fillStyle = info.color2;
      ctx.beginPath();
      ctx.moveTo(-2, -r - 2);
      ctx.lineTo(-8, -r - 14);
      ctx.lineTo(2, -r - 4);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(6, -r - 2);
      ctx.lineTo(12, -r - 14);
      ctx.lineTo(10, -r - 4);
      ctx.fill();
      // Dragon wings (big)
      ctx.strokeStyle = info.color1 + '88';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(-5, -2);
      ctx.quadraticCurveTo(-r - 15, -r - 10 + Math.sin(elapsedSec * 8) * 5, -r - 8, 4);
      ctx.stroke();
    }
    if (stage >= 6) {
      // God halo
      ctx.strokeStyle = '#ffdd00aa';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(0, -r - 10, 12, 4, Math.sin(elapsedSec * 3) * 0.1, 0, Math.PI * 2);
      ctx.stroke();
      // Sparkles around
      for (let i = 0; i < 4; i++) {
        const sa = elapsedSec * 4 + i * Math.PI / 2;
        const sx = Math.cos(sa) * (r + 10);
        const sy = Math.sin(sa) * (r + 10);
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(sx, sy, 1.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Tail
    ctx.fillStyle = info.color2 + 'cc';
    ctx.beginPath();
    ctx.moveTo(-r + 2, -2);
    ctx.lineTo(-r - 6 - stage * 2, -4 - stage);
    ctx.lineTo(-r - 4 - stage, 0);
    ctx.lineTo(-r - 6 - stage * 2, 4 + stage);
    ctx.lineTo(-r + 2, 3);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  };

  const drawBackground = (ctx: CanvasRenderingContext2D, W: number, H: number, fc: number, stage: number) => {
    const skyColors = [
      ['#0b0d2a','#1a1040','#0a0e1a'], ['#0b102a','#1a1848','#0a0e1a'],
      ['#0a1a2a','#102050','#0a1530'], ['#1a0a2a','#301050','#1a0530'],
      ['#2a0a0a','#501010','#2a0505'], ['#0a2a20','#103828','#0a2510'],
      ['#1a1a08','#303010','#1a1500'],
    ];
    const c = skyColors[stage] || skyColors[0];
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, c[0]); g.addColorStop(0.5, c[1]); g.addColorStop(1, c[2]);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    for (let i = 0; i < 50; i++) {
      const sx = ((i * 97 + fc * 0.2) % (W + 20)) - 10;
      const sy = (i * 73 + Math.sin(i + fc * 0.02) * 3) % (H * 0.7);
      ctx.fillStyle = `rgba(255,255,255,${0.3 + Math.sin(fc * 0.05 + i) * 0.2})`;
      ctx.fillRect(sx, sy, i % 3 === 0 ? 2 : 1.5, i % 3 === 0 ? 2 : 1.5);
    }

    // Ground
    const gg = ctx.createLinearGradient(0, H - 30, 0, H);
    gg.addColorStop(0, '#1a4a20'); gg.addColorStop(1, '#060f08');
    ctx.fillStyle = gg;
    ctx.fillRect(0, H - 30, W, 30);
    ctx.strokeStyle = '#2a7a30';
    ctx.lineWidth = 1;
    for (let i = 0; i < W; i += 6) {
      ctx.beginPath();
      ctx.moveTo(i, H - 30);
      ctx.lineTo(i + 2, H - 30 - 5 - Math.sin(i * 0.3 + fc * 0.1) * 3);
      ctx.stroke();
    }
  };

  const drawPipe = (ctx: CanvasRenderingContext2D, pipe: Pipe, H: number, stage: number) => {
    const pc = [['#1a8a40','#33ee66'],['#1a8a40','#33ee66'],['#2a6a8a','#44ccee'],
      ['#6a2a8a','#cc44ee'],['#8a2a2a','#ee4444'],['#2a8a6a','#44eecc'],['#8a8a2a','#eeee44']][stage] || ['#1a8a40','#33ee66'];
    const gr = ctx.createLinearGradient(pipe.x, 0, pipe.x + pipe.width, 0);
    gr.addColorStop(0, pc[0]); gr.addColorStop(0.5, pc[1]); gr.addColorStop(1, pc[0]);
    ctx.fillStyle = gr;
    ctx.fillRect(pipe.x, 0, pipe.width, pipe.gapY);
    ctx.fillRect(pipe.x - 5, pipe.gapY - 18, pipe.width + 10, 18);
    const bY = pipe.gapY + pipe.gapHeight;
    ctx.fillStyle = gr;
    ctx.fillRect(pipe.x, bY, pipe.width, H - 30 - bY);
    ctx.fillRect(pipe.x - 5, bY, pipe.width + 10, 18);
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    ctx.fillRect(pipe.x + 8, 0, 5, pipe.gapY);
    ctx.fillRect(pipe.x + 8, bY, 5, H - 30 - bY);
  };

  const drawStar = (ctx: CanvasRenderingContext2D, star: Star) => {
    if (star.collected) return;
    ctx.save();
    ctx.translate(star.x, star.y);
    ctx.rotate(star.angle);
    ctx.shadowColor = '#ffdd00'; ctx.shadowBlur = 20;
    ctx.fillStyle = '#ffee44';
    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
      const a = (i * 4 * Math.PI) / 5 - Math.PI / 2;
      ctx.lineTo(Math.cos(a) * star.radius, Math.sin(a) * star.radius);
      ctx.lineTo(Math.cos(a + Math.PI / 5) * star.radius * 0.4, Math.sin(a + Math.PI / 5) * star.radius * 0.4);
    }
    ctx.closePath(); ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#00ffcc';
    ctx.font = 'bold 8px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('-2s', 0, star.radius + 12);
    ctx.restore();
  };

  // ===== INTRO SCREEN - Animated game demo =====
  useEffect(() => {
    if (phase !== 'intro') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const W = canvas.width, H = canvas.height;

    let frame = 0;
    let demoBirdY = 300;
    let demoBirdVy = 0;
    const demoPipes: { x: number; gapY: number; gapH: number }[] = [
      { x: 250, gapY: 150, gapH: 120 },
      { x: 420, gapY: 250, gapH: 120 },
    ];
    let demoStar = { x: 445, y: 310, angle: 0 };

    const introLoop = () => {
      frame++;

      // Bird auto-flap
      if (frame % 38 === 0) demoBirdVy = -5;
      demoBirdVy += 0.28;
      demoBirdY += demoBirdVy;
      if (demoBirdY > H - 60) { demoBirdY = H - 60; demoBirdVy = 0; }
      if (demoBirdY < 40) { demoBirdY = 40; demoBirdVy = 0; }

      // Move pipes
      demoPipes.forEach(p => {
        p.x -= 1.5;
        if (p.x < -60) { p.x = W + 20; p.gapY = 100 + Math.random() * 200; }
      });
      demoStar.x -= 1.5;
      demoStar.angle += 0.04;
      if (demoStar.x < -20) { demoStar.x = W + 50; demoStar.y = 150 + Math.random() * 250; }

      // Background
      const skyGrad = ctx.createLinearGradient(0, 0, 0, H);
      skyGrad.addColorStop(0, '#0b0d2a');
      skyGrad.addColorStop(0.5, '#1a1040');
      skyGrad.addColorStop(1, '#0a0e1a');
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, W, H);

      // Stars
      for (let i = 0; i < 30; i++) {
        const sx = ((i * 97 + frame * 0.3) % (W + 20)) - 10;
        const sy = (i * 73) % (H * 0.7);
        ctx.fillStyle = `rgba(255,255,255,${0.2 + Math.sin(frame * 0.03 + i) * 0.15})`;
        ctx.fillRect(sx, sy, 1.5, 1.5);
      }

      // Ground
      ctx.fillStyle = '#1a4a20';
      ctx.fillRect(0, H - 30, W, 30);

      // Pipes
      demoPipes.forEach(p => {
        const gr = ctx.createLinearGradient(p.x, 0, p.x + 50, 0);
        gr.addColorStop(0, '#1a8a40'); gr.addColorStop(0.5, '#33ee66'); gr.addColorStop(1, '#1a8a40');
        ctx.fillStyle = gr;
        ctx.fillRect(p.x, 0, 50, p.gapY);
        ctx.fillRect(p.x - 5, p.gapY - 15, 60, 15);
        const bY = p.gapY + p.gapH;
        ctx.fillRect(p.x, bY, 50, H - 30 - bY);
        ctx.fillRect(p.x - 5, bY, 60, 15);
      });

      // Bird cycling stages
      const demoStage = Math.floor(frame / 90) % BIRD_STAGES.length;
      drawBird(ctx, { x: 90, y: demoBirdY, vy: demoBirdVy, radius: BIRD_STAGES[demoStage].size }, frame / 60, demoStage);

      // ---- TAP HINT (center) ----
      // Finger icon area
      const fingerX = W / 2;
      const fingerY = H / 2 - 30;
      const tapPulse = Math.sin(Date.now() * 0.006);
      const tapScale = 1 + tapPulse * 0.12;

      ctx.save();
      ctx.translate(fingerX, fingerY);
      ctx.scale(tapScale, tapScale);
      ctx.font = '52px serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowColor = '#00ff88';
      ctx.shadowBlur = 20 + tapPulse * 10;
      ctx.fillText('👆', 0, 0);
      ctx.shadowBlur = 0;
      ctx.restore();

      // Arrow up
      const arrowAlpha = 0.5 + tapPulse * 0.5;
      ctx.globalAlpha = arrowAlpha;
      ctx.fillStyle = '#00ff88';
      ctx.font = 'bold 20px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('▲  JUMP', W / 2, fingerY + 50);
      ctx.globalAlpha = 1;

      // Title at top
      ctx.fillStyle = '#00000099';
      ctx.fillRect(0, 0, W, 55);
      ctx.fillStyle = '#00ff88';
      ctx.font = 'bold 20px "Orbitron", monospace';
      ctx.textAlign = 'center';
      ctx.shadowColor = '#00ff88'; ctx.shadowBlur = 12;
      ctx.fillText('FLAPPY EVOLUTION', W / 2, 36);
      ctx.shadowBlur = 0;

      // TAP TO START pulsing at bottom
      ctx.fillStyle = '#00000099';
      ctx.fillRect(0, H - 50, W, 50);
      const pulse = 0.65 + Math.sin(Date.now() * 0.005) * 0.35;
      ctx.globalAlpha = pulse;
      ctx.fillStyle = '#00ff88';
      ctx.shadowColor = '#00ff88'; ctx.shadowBlur = 15;
      ctx.font = 'bold 17px "Orbitron", monospace';
      ctx.textAlign = 'center';
      ctx.fillText('[ TAP TO START ]', W / 2, H - 18);
      ctx.globalAlpha = 1;
      ctx.shadowBlur = 0;

      gameRef.current.animationId = requestAnimationFrame(introLoop);
    };

    gameRef.current.animationId = requestAnimationFrame(introLoop);
    return () => cancelAnimationFrame(gameRef.current.animationId);
  }, [phase]);

  // ===== MAIN GAME LOOP =====
  useEffect(() => {
    if (phase !== 'playing') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const W = canvas.width, H = canvas.height;
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

      const elapsedSec = g.elapsedMs / 1000;
      if (elapsedSec >= maxTime) { endGame(); return; }

      const diff = getDifficulty(elapsedSec);

      // Check evolution based on pipes passed
      const newStage = Math.min(Math.floor(g.pipesPassed / PIPES_PER_EVOLUTION), BIRD_STAGES.length - 1);
      if (newStage > g.stage) {
        g.stage = newStage;
        playEvolutionSound();
        spawnParticles(g.bird.x, g.bird.y, BIRD_STAGES[newStage].color1, 35);
        spawnParticles(g.bird.x, g.bird.y, '#ffffff', 15);
        g.bird.radius = BIRD_STAGES[newStage].size;
        g.evolveFlashTimer = 40;
      }

      if (g.scorePopTimer > 0) g.scorePopTimer--;
      if (g.evolveFlashTimer > 0) g.evolveFlashTimer--;

      // Physics
      g.bird.vy += GRAVITY;
      g.bird.y += g.bird.vy;
      if (g.bird.y - g.bird.radius < 0) { g.bird.y = g.bird.radius; g.bird.vy = 0; }
      if (g.bird.y + g.bird.radius > H - 30) { g.bird.y = H - 30 - g.bird.radius; g.bird.vy = 0; }

      // Pipes
      g.pipeTimer++;
      if (g.pipeTimer >= diff.pipeInterval) {
        g.pipeTimer = 0;
        const gapH = diff.gapHeight;
        const gapY = Math.random() * (H - 30 - gapH - 80) + 40;
        g.pipes.push({ x: W, gapY, gapHeight: gapH, width: 50, passed: false });
        if (Math.random() < 0.45) {
          g.stars.push({ x: W + 25, y: gapY + gapH / 2, radius: 10, collected: false, angle: 0 });
        }
      }

      g.pipes.forEach(p => {
        p.x -= diff.pipeSpeed;
        if (!p.passed && p.x + p.width < g.bird.x) {
          p.passed = true;
          g.pipesPassed++;
          g.comboCount++;
          const pipeScore = 1 + Math.floor(elapsedSec / 5);
          const combo = Math.min(g.comboCount, 5);
          const total = pipeScore * combo;
          g.score += total;
          g.scorePopText = `+${total}${combo > 1 ? ` x${combo}` : ''}`;
          g.scorePopTimer = 60;
          playScoreSound();
          spawnParticles(g.bird.x, g.bird.y, '#00ff88', 8);
        }
      });
      g.pipes = g.pipes.filter(p => p.x + p.width > -10);

      g.stars.forEach(s => { s.x -= diff.pipeSpeed; s.angle += 0.05; });
      g.stars = g.stars.filter(s => s.x > -20 && !s.collected);

      g.particles.forEach(p => { p.x += p.vx; p.y += p.vy; p.life -= 0.03; });
      g.particles = g.particles.filter(p => p.life > 0);

      // Collision: pipes
      for (const p of g.pipes) {
        if (g.bird.x + g.bird.radius > p.x && g.bird.x - g.bird.radius < p.x + p.width) {
          if (g.bird.y - g.bird.radius < p.gapY || g.bird.y + g.bird.radius > p.gapY + p.gapHeight) {
            playHitSound();
            spawnParticles(g.bird.x, g.bird.y, '#ff4444', 25);
            endGame();
            return;
          }
        }
      }

      // Collision: stars
      g.stars.forEach(s => {
        if (s.collected) return;
        const dx = g.bird.x - s.x, dy = g.bird.y - s.y;
        if (Math.sqrt(dx * dx + dy * dy) < g.bird.radius + s.radius) {
          s.collected = true;
          g.elapsedMs = Math.max(0, g.elapsedMs - STAR_TIME_BONUS);
          g.score += 10;
          playStarSound();
          spawnParticles(s.x, s.y, '#ffee44', 25);
          g.scorePopText = '⭐ +10 & -2s!';
          g.scorePopTimer = 80;
        }
      });

      // ===== DRAW =====
      drawBackground(ctx, W, H, g.frameCount, g.stage);

      // Evolution flash
      if (g.evolveFlashTimer > 0) {
        ctx.fillStyle = `rgba(255,255,255,${g.evolveFlashTimer / 60})`;
        ctx.fillRect(0, 0, W, H);
      }

      g.pipes.forEach(p => drawPipe(ctx, p, H, g.stage));
      g.stars.forEach(s => drawStar(ctx, s));
      drawBird(ctx, g.bird, elapsedSec, g.stage);

      // Particles
      g.particles.forEach(p => {
        ctx.globalAlpha = p.life;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.globalAlpha = 1;

      // HUD
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
      ctx.textAlign = 'right';
      ctx.fillStyle = BIRD_STAGES[g.stage].color1;
      ctx.font = 'bold 11px "Orbitron", monospace';
      ctx.fillText(BIRD_STAGES[g.stage].name, W - 10, 29);

      // Pipe count for evolution progress
      const nextEvo = (g.stage + 1) * PIPES_PER_EVOLUTION;
      if (g.stage < BIRD_STAGES.length - 1) {
        ctx.fillStyle = '#ffffff66';
        ctx.font = '9px monospace';
        ctx.textAlign = 'right';
        ctx.fillText(`Next: ${g.pipesPassed}/${nextEvo}`, W - 10, 40);
      }

      // Score popup
      if (g.scorePopTimer > 0) {
        ctx.globalAlpha = Math.min(1, g.scorePopTimer / 30);
        ctx.fillStyle = '#00ff88';
        ctx.font = 'bold 18px "Orbitron", monospace';
        ctx.textAlign = 'center';
        ctx.fillText(g.scorePopText, g.bird.x, g.bird.y - 30 - (60 - g.scorePopTimer));
        ctx.globalAlpha = 1;
      }

      g.animationId = requestAnimationFrame(loop);
    };

    g.animationId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(g.animationId);
  }, [phase, maxTime, onGameEnd]);

  // Input
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'ArrowUp') {
        e.preventDefault();
        if (phase === 'intro') startCountdown(); else flap();
      }
    };
    const handleTouch = () => { if (phase === 'intro') startCountdown(); else flap(); };
    window.addEventListener('keydown', handleKey);
    window.addEventListener('touchstart', handleTouch);
    return () => { window.removeEventListener('keydown', handleKey); window.removeEventListener('touchstart', handleTouch); };
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
              {BIRD_STAGES[gameRef.current.stage].name} • Pipes: {gameRef.current.pipesPassed}
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
