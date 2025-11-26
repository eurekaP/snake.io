import React, { useEffect, useRef, useState, useCallback } from 'react';
import { GameState, Snake, Food, Particle, WORLD_SIZE, SNAKE_COLORS, BASE_SPEED, BOOST_SPEED, TURN_SPEED, SEGMENT_DISTANCE, INITIAL_LENGTH } from '../types';
import { getDistance, getAngle, movePoint, getShortestAngleDiff, checkCircleCollision } from '../utils/geometry';

interface GameCanvasProps {
  gameState: GameState;
  playerName: string;
  onGameOver: (score: number) => void;
  setScore: (score: number) => void;
  setLeaderboard: (leaders: { name: string; score: number }[]) => void;
}

const GameCanvas: React.FC<GameCanvasProps> = ({ gameState, playerName, onGameOver, setScore, setLeaderboard }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>();
  const mouseRef = useRef<{ x: number; y: number; mouseDown: boolean }>({ x: 0, y: 0, mouseDown: false });

  // Game State Refs (using refs for performance to avoid react re-renders on every frame)
  const playerRef = useRef<Snake | null>(null);
  const botsRef = useRef<Snake[]>([]);
  const foodRef = useRef<Food[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const cameraRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const scoreRef = useRef<number>(0);

  // Initialize Game
  const initGame = useCallback(() => {
    // Create Player
    const startX = Math.random() * 1000 - 500;
    const startY = Math.random() * 1000 - 500;
    
    playerRef.current = createSnake('player-1', playerName || 'You', startX, startY, SNAKE_COLORS[0], false);
    scoreRef.current = 0;
    setScore(0);

    // Create Bots
    botsRef.current = Array.from({ length: 25 }).map((_, i) => 
      createSnake(`bot-${i}`, `Bot ${i + 1}`, Math.random() * WORLD_SIZE - WORLD_SIZE/2, Math.random() * WORLD_SIZE - WORLD_SIZE/2, SNAKE_COLORS[(i + 1) % SNAKE_COLORS.length], true)
    );

    // Create Initial Food
    foodRef.current = Array.from({ length: 500 }).map(() => createFood());
    particlesRef.current = [];
  }, [playerName, setScore]);

  useEffect(() => {
    if (gameState === GameState.PLAYING) {
      initGame();
      requestRef.current = requestAnimationFrame(gameLoop);
    } else {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    }
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [gameState, initGame]);

  const createSnake = (id: string, name: string, x: number, y: number, color: string, isBot: boolean): Snake => {
    const body = [];
    for (let i = 0; i < INITIAL_LENGTH; i++) {
      body.push({ x: x - i * 5, y: y });
    }
    return {
      id,
      name,
      body,
      angle: Math.random() * Math.PI * 2,
      length: INITIAL_LENGTH,
      color,
      isBoosting: false,
      score: 0,
      isDead: false,
      isBot,
      skinIndex: Math.floor(Math.random() * SNAKE_COLORS.length)
    };
  };

  const createFood = (x?: number, y?: number, value: number = 10): Food => {
    return {
      id: Math.random().toString(36).substr(2, 9),
      x: x ?? (Math.random() * WORLD_SIZE - WORLD_SIZE / 2),
      y: y ?? (Math.random() * WORLD_SIZE - WORLD_SIZE / 2),
      value,
      color: `hsl(${Math.random() * 360}, 70%, 60%)`,
      radius: value > 20 ? 8 : 4 + Math.random() * 2
    };
  };

  // Main Game Loop
  const gameLoop = () => {
    if (gameState !== GameState.PLAYING) return;

    update();
    draw();
    requestRef.current = requestAnimationFrame(gameLoop);
  };

  const update = () => {
    if (!playerRef.current || playerRef.current.isDead) return;

    // 1. Update Player Input
    const player = playerRef.current;
    
    // Calculate angle towards mouse relative to center of screen (since camera is centered on snake)
    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight / 2;
    const targetAngle = getAngle({ x: centerX, y: centerY }, { x: mouseRef.current.x, y: mouseRef.current.y });
    
    // Smooth turning
    const diff = getShortestAngleDiff(player.angle, targetAngle);
    player.angle += Math.sign(diff) * Math.min(Math.abs(diff), TURN_SPEED);
    player.isBoosting = mouseRef.current.mouseDown && player.length > 15;

    // 2. Update Bots AI
    botsRef.current.forEach(bot => {
      if (bot.isDead) return;
      
      // Simple AI: Move randomly but try to steer towards food nearby
      if (Math.random() < 0.05) {
        bot.angle += (Math.random() - 0.5) * 1.5;
      }
      
      // Avoid borders
      if (Math.abs(bot.body[0].x) > WORLD_SIZE/2 - 200) {
        bot.angle = bot.body[0].x > 0 ? Math.PI : 0;
      }
      if (Math.abs(bot.body[0].y) > WORLD_SIZE/2 - 200) {
        bot.angle = bot.body[0].y > 0 ? -Math.PI/2 : Math.PI/2;
      }

      // Random boost
      bot.isBoosting = bot.length > 20 && Math.random() < 0.01;
      if (bot.isBoosting && Math.random() < 0.1) bot.isBoosting = false;
    });

    // 3. Move All Snakes
    const allSnakes = [player, ...botsRef.current];
    allSnakes.forEach(snake => {
      if (snake.isDead) return;

      const speed = snake.isBoosting ? BOOST_SPEED : BASE_SPEED;
      
      // Move Head
      const head = snake.body[0];
      const newHead = movePoint(head, snake.angle, speed);
      
      // Check World Boundaries
      if (Math.abs(newHead.x) > WORLD_SIZE / 2 || Math.abs(newHead.y) > WORLD_SIZE / 2) {
        killSnake(snake);
        return;
      }

      // Update Body Segments
      // We don't just shift array, we use a constraint relaxation or follow-the-leader approach
      // Simpler approach: New head is unshift, pop tail if length matches target
      // To make it smooth like Slither.io, we need the points to be close, but we render segments with width.
      
      snake.body.unshift(newHead);
      
      // Boosting costs length
      if (snake.isBoosting && snake.length > INITIAL_LENGTH) {
        snake.length -= 0.1; // Shrink slowly
        // Drop food particles when boosting
        if (Math.random() < 0.3) {
           const tail = snake.body[snake.body.length - 1];
           foodRef.current.push(createFood(tail.x + (Math.random()-0.5)*20, tail.y + (Math.random()-0.5)*20, 5));
        }
      }

      // Maintain length
      while (snake.body.length > Math.floor(snake.length)) {
        snake.body.pop();
      }
    });

    // 4. Collisions
    // Check Food
    allSnakes.forEach(snake => {
      if (snake.isDead) return;
      const head = snake.body[0];
      const headRadius = 15 + Math.min(10, snake.length / 50); // Head grows slightly

      // Eat Food
      for (let i = foodRef.current.length - 1; i >= 0; i--) {
        const f = foodRef.current[i];
        if (checkCircleCollision(head, headRadius, f, f.radius)) {
          snake.length += f.value / 10;
          snake.score += f.value;
          if (snake === player) {
             scoreRef.current = Math.floor(snake.score);
             setScore(scoreRef.current);
          }
          foodRef.current.splice(i, 1);
        }
      }
      
      // Respawn Food
      if (foodRef.current.length < 500) {
        if (Math.random() < 0.5) foodRef.current.push(createFood());
      }
    });

    // Check Snake vs Snake
    allSnakes.forEach(snakeA => {
      if (snakeA.isDead) return;
      const headA = snakeA.body[0];
      
      allSnakes.forEach(snakeB => {
        if (snakeB.isDead) return;
        
        // Check collision with body segments of B
        // Skip checking against own head and immediate neck
        let startIndex = (snakeA === snakeB) ? 10 : 0; 

        for (let i = startIndex; i < snakeB.body.length; i += 2) { // Check every other segment for perf
           const seg = snakeB.body[i];
           // Simple point collision
           const dist = getDistance(headA, seg);
           // If head touches body (radius approx 15)
           if (dist < 20) {
             killSnake(snakeA);
             return; // Snake A died
           }
        }
      });
    });

    // 5. Update Particles
    particlesRef.current.forEach((p, i) => {
      p.x += p.vx;
      p.y += p.vy;
      p.life -= 0.02;
      if (p.life <= 0) particlesRef.current.splice(i, 1);
    });

    // Update Camera to center on player
    if (player && !player.isDead) {
      // Smooth camera
      cameraRef.current.x = lerp(cameraRef.current.x, player.body[0].x, 0.1);
      cameraRef.current.y = lerp(cameraRef.current.y, player.body[0].y, 0.1);
    }
    
    // Update Leaderboard Data periodically
    if (Math.random() < 0.05) {
       const leaders = allSnakes
         .filter(s => !s.isDead)
         .sort((a, b) => b.score - a.score)
         .slice(0, 5)
         .map(s => ({ name: s.name, score: Math.floor(s.score) }));
       setLeaderboard(leaders);
    }
  };

  const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

  const killSnake = (snake: Snake) => {
    snake.isDead = true;
    
    // Turn body into food
    snake.body.forEach((seg, i) => {
      if (i % 3 === 0) { // Don't spawn food for every single pixel, too much
        foodRef.current.push(createFood(seg.x, seg.y, 20));
      }
    });

    // Respawn bot
    if (snake.isBot) {
       setTimeout(() => {
          const idx = botsRef.current.indexOf(snake);
          if (idx !== -1) {
             botsRef.current[idx] = createSnake(snake.id, snake.name, Math.random() * WORLD_SIZE - WORLD_SIZE/2, Math.random() * WORLD_SIZE - WORLD_SIZE/2, snake.color, true);
          }
       }, 2000);
    } else {
       // Player died
       onGameOver(scoreRef.current);
    }
  };

  const draw = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const camX = cameraRef.current.x;
    const camY = cameraRef.current.y;

    // Clear Screen
    ctx.fillStyle = '#111827'; // Tailwind gray-900
    ctx.fillRect(0, 0, width, height);

    ctx.save();
    // Center camera
    ctx.translate(width / 2 - camX, height / 2 - camY);

    // Draw Grid
    ctx.strokeStyle = '#1f2937'; // gray-800
    ctx.lineWidth = 2;
    const gridSize = 100;
    
    // Optimize grid drawing to only view area
    const startX = Math.floor((camX - width/2) / gridSize) * gridSize;
    const endX = Math.floor((camX + width/2) / gridSize) * gridSize + gridSize;
    const startY = Math.floor((camY - height/2) / gridSize) * gridSize;
    const endY = Math.floor((camY + height/2) / gridSize) * gridSize + gridSize;

    ctx.beginPath();
    for (let x = startX; x <= endX; x += gridSize) {
      ctx.moveTo(x, startY);
      ctx.lineTo(x, endY);
    }
    for (let y = startY; y <= endY; y += gridSize) {
      ctx.moveTo(startX, y);
      ctx.lineTo(endX, y);
    }
    ctx.stroke();

    // Draw World Borders
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 10;
    ctx.strokeRect(-WORLD_SIZE/2, -WORLD_SIZE/2, WORLD_SIZE, WORLD_SIZE);

    // Draw Food
    foodRef.current.forEach(f => {
      // Cull invisible food
      if (f.x < camX - width/2 - 50 || f.x > camX + width/2 + 50 || 
          f.y < camY - height/2 - 50 || f.y > camY + height/2 + 50) return;

      ctx.beginPath();
      ctx.arc(f.x, f.y, f.radius, 0, Math.PI * 2);
      ctx.fillStyle = f.color;
      ctx.shadowBlur = 10;
      ctx.shadowColor = f.color;
      ctx.fill();
      ctx.shadowBlur = 0;
    });

    // Draw Snakes
    const allSnakes = [...botsRef.current, playerRef.current].filter(s => s && !s.isDead) as Snake[];
    // Draw dead snakes last? No, live snakes on top.
    
    allSnakes.forEach(snake => {
      // Simple culling check (very rough)
      const head = snake.body[0];
      if (Math.abs(head.x - camX) > width && Math.abs(head.y - camY) > height) return;

      // Draw Body
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      
      // We draw the snake as a thick line for the body segments
      // To make it look segmented like Slither.io, we can draw circles, or a stroke.
      // Stroke is faster.
      const snakeWidth = 20 + Math.min(10, snake.length / 100);
      
      ctx.beginPath();
      if (snake.body.length > 0) {
        ctx.moveTo(snake.body[0].x, snake.body[0].y);
        // Using a few control points for curves or just straight lines
        for (let i = 1; i < snake.body.length; i++) {
           // Skip every few points to smooth out jitter
           if (i % 2 === 0 || i === snake.body.length - 1) {
             ctx.lineTo(snake.body[i].x, snake.body[i].y);
           }
        }
      }
      ctx.lineWidth = snakeWidth;
      ctx.strokeStyle = snake.color;
      ctx.shadowColor = snake.color;
      ctx.shadowBlur = snake.isBoosting ? 20 : 0;
      ctx.stroke();
      ctx.shadowBlur = 0;
      
      // Draw Head Eyes
      if (snake.body.length > 0) {
          const h = snake.body[0];
          ctx.save();
          ctx.translate(h.x, h.y);
          ctx.rotate(snake.angle);
          
          ctx.fillStyle = 'white';
          ctx.beginPath();
          ctx.arc(8, -8, 6, 0, Math.PI * 2);
          ctx.arc(8, 8, 6, 0, Math.PI * 2);
          ctx.fill();
          
          ctx.fillStyle = 'black';
          ctx.beginPath();
          ctx.arc(10, -8, 3, 0, Math.PI * 2);
          ctx.arc(10, 8, 3, 0, Math.PI * 2);
          ctx.fill();
          
          ctx.restore();
      }

      // Draw Name
      ctx.fillStyle = 'white';
      ctx.font = 'bold 14px "Exo 2"';
      ctx.textAlign = 'center';
      ctx.fillText(snake.name, snake.body[0].x, snake.body[0].y - 30);
    });

    ctx.restore();
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    mouseRef.current.x = e.clientX;
    mouseRef.current.y = e.clientY;
  };

  const handleMouseDown = () => { mouseRef.current.mouseDown = true; };
  const handleMouseUp = () => { mouseRef.current.mouseDown = false; };
  
  const handleTouchStart = (e: React.TouchEvent) => {
     mouseRef.current.mouseDown = true;
     if(e.touches.length > 0) {
        mouseRef.current.x = e.touches[0].clientX;
        mouseRef.current.y = e.touches[0].clientY;
     }
  };
  const handleTouchMove = (e: React.TouchEvent) => {
     if(e.touches.length > 0) {
        mouseRef.current.x = e.touches[0].clientX;
        mouseRef.current.y = e.touches[0].clientY;
     }
  };
  const handleTouchEnd = () => { mouseRef.current.mouseDown = false; };

  // Resize handler
  useEffect(() => {
    const handleResize = () => {
      if (canvasRef.current) {
        canvasRef.current.width = window.innerWidth;
        canvasRef.current.height = window.innerHeight;
      }
    };
    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="block absolute top-0 left-0 w-full h-full cursor-crosshair touch-none"
      onMouseMove={handleMouseMove}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    />
  );
};

export default GameCanvas;
