import React, { useRef, useEffect } from 'react';
import { useTheme } from '@/contexts/ThemeContext';

interface Point {
  x: number;
  y: number;
  baseX: number;
  baseY: number;
  vx: number;
  vy: number;
}

const InteractiveGrid: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { theme } = useTheme();
  const mouseRef = useRef({ x: 0, y: 0 });
  const pointsRef = useRef<Point[][]>([]);
  const animationRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Configuration
    const gridSpacing = 40;
    const influenceRadius = 40;
    const springStrength = 0.015;
    const damping = 0.92;

    const isDark = theme === 'dark';
    const lineColor = isDark ? 'rgba(59, 130, 246, 0.15)' : 'rgba(59, 130, 246, 0.12)';
    const glowColor = isDark ? 'rgba(59, 130, 246, 0.4)' : 'rgba(59, 130, 246, 0.3)';

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      initializeGrid();
    };

    const initializeGrid = () => {
      const cols = Math.ceil(canvas.width / gridSpacing) + 1;
      const rows = Math.ceil(canvas.height / gridSpacing) + 1;
      
      pointsRef.current = [];
      for (let i = 0; i < cols; i++) {
        pointsRef.current[i] = [];
        for (let j = 0; j < rows; j++) {
          const x = i * gridSpacing;
          const y = j * gridSpacing;
          pointsRef.current[i][j] = {
            x,
            y,
            baseX: x,
            baseY: y,
            vx: 0,
            vy: 0
          };
        }
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current = { x: e.clientX, y: e.clientY };
    };

    const updatePoints = () => {
      const mouse = mouseRef.current;
      
      pointsRef.current.forEach(col => {
        col.forEach(point => {
          const dx = mouse.x - point.x;
          const dy = mouse.y - point.y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance < influenceRadius) {
            const force = (1 - distance / influenceRadius) * 5;
            const angle = Math.atan2(dy, dx);
            point.vx -= Math.cos(angle) * force;
            point.vy -= Math.sin(angle) * force;
          }

          // Spring back to original position
          const springX = (point.baseX - point.x) * springStrength;
          const springY = (point.baseY - point.y) * springStrength;
          
          point.vx += springX;
          point.vy += springY;
          
          // Apply damping
          point.vx *= damping;
          point.vy *= damping;
          
          // Update position
          point.x += point.vx;
          point.y += point.vy;
        });
      });
    };

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      const mouse = mouseRef.current;
      const points = pointsRef.current;

      // Draw horizontal lines
      for (let j = 0; j < points[0].length; j++) {
        ctx.beginPath();
        for (let i = 0; i < points.length; i++) {
          const point = points[i][j];
          
          if (i === 0) {
            ctx.moveTo(point.x, point.y);
          } else {
            ctx.lineTo(point.x, point.y);
          }
        }
        
        ctx.strokeStyle = lineColor;
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      // Draw vertical lines
      for (let i = 0; i < points.length; i++) {
        ctx.beginPath();
        for (let j = 0; j < points[i].length; j++) {
          const point = points[i][j];
          
          if (j === 0) {
            ctx.moveTo(point.x, point.y);
          } else {
            ctx.lineTo(point.x, point.y);
          }
        }
        
        ctx.strokeStyle = lineColor;
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      // Draw glow effect around mouse
      const gradient = ctx.createRadialGradient(
        mouse.x, mouse.y, 0,
        mouse.x, mouse.y, influenceRadius
      );
      gradient.addColorStop(0, glowColor);
      gradient.addColorStop(1, 'rgba(59, 130, 246, 0)');
      
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw intersection points with enhanced glow near mouse
      points.forEach(col => {
        col.forEach(point => {
          const dx = mouse.x - point.x;
          const dy = mouse.y - point.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          
          if (distance < influenceRadius) {
            const intensity = 1 - distance / influenceRadius;
            const radius = 2 + intensity * 3;
            
            ctx.beginPath();
            ctx.arc(point.x, point.y, radius, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(59, 130, 246, ${intensity * 0.6})`;
            ctx.fill();
            
            // Add glow
            const pointGradient = ctx.createRadialGradient(
              point.x, point.y, 0,
              point.x, point.y, radius * 3
            );
            pointGradient.addColorStop(0, `rgba(59, 130, 246, ${intensity * 0.3})`);
            pointGradient.addColorStop(1, 'rgba(59, 130, 246, 0)');
            
            ctx.fillStyle = pointGradient;
            ctx.fillRect(
              point.x - radius * 3,
              point.y - radius * 3,
              radius * 6,
              radius * 6
            );
          }
        });
      });
    };

    const animate = () => {
      updatePoints();
      draw();
      animationRef.current = requestAnimationFrame(animate);
    };

    // Initialize
    resize();
    window.addEventListener('resize', resize);
    window.addEventListener('mousemove', handleMouseMove);
    animate();

    return () => {
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', handleMouseMove);
      if (animationRef.current !== null) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [theme]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 w-full h-full pointer-events-none"
      style={{ zIndex: 10 }}
    />
  );
};

export default InteractiveGrid;
