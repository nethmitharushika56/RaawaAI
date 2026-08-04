import React, { useEffect, useRef } from 'react';

const STAR_COLORS = [
  'rgba(255, 255, 255, ',  // White
  'rgba(165, 243, 252, ',  // Pale Cyan (cyan-200)
  'rgba(192, 132, 252, ',  // Pale Purple (purple-400)
  'rgba(147, 197, 253, ',  // Pale Blue (blue-300)
];

const SPARKLE_COLORS = [
  '#a5f3fc', // Cyan
  '#c084fc', // Purple
  '#93c5fd', // Blue
  '#ffffff', // White
];

const InteractiveBackground = () => {
  const canvasRef = useRef(null);
  const mouseRef = useRef({ x: 0, y: 0, active: false });
  const ripplesRef = useRef([]);
  const sparklesRef = useRef([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId;
    let stars = [];
    let width = window.innerWidth;
    let height = window.innerHeight;

    // Density configuration based on screen width
    const getStarCount = (w) => {
      if (w < 640) return 60;  // Mobile
      if (w < 1024) return 100; // Tablet
      return 150; // Desktop
    };

    let targetStarCount = getStarCount(width);

    const resizeCanvas = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      
      const dpr = window.devicePixelRatio || 1;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      
      ctx.scale(dpr, dpr);

      targetStarCount = getStarCount(width);
      adjustStarDensity();
    };

    class Star {
      constructor(isNew = false) {
        this.reset(isNew);
      }

      reset(isNew = false) {
        if (isNew) {
          this.x = Math.random() * width;
          this.y = Math.random() * height;
        } else {
          // Re-spawn on opposite edge depending on drift direction
          // Starfield drifts slowly left/down
          const side = Math.random();
          if (side < 0.5) { // Spawn on Right
            this.x = width + 10;
            this.y = Math.random() * height;
          } else { // Spawn on Top
            this.x = Math.random() * width;
            this.y = -10;
          }
        }

        // Layer definition for 3D parallax depth
        // 0 = background (tiny, slow), 1 = middle (medium), 2 = foreground (larger, connects to mouse)
        const rand = Math.random();
        if (rand < 0.55) {
          this.layer = 0;
          this.radius = 0.5 + Math.random() * 0.6;
          this.speedScale = 0.15;
          this.baseAlpha = 0.15 + Math.random() * 0.25;
        } else if (rand < 0.85) {
          this.layer = 1;
          this.radius = 1.1 + Math.random() * 0.6;
          this.speedScale = 0.4;
          this.baseAlpha = 0.4 + Math.random() * 0.3;
        } else {
          this.layer = 2;
          this.radius = 1.7 + Math.random() * 0.8;
          this.speedScale = 0.75;
          this.baseAlpha = 0.65 + Math.random() * 0.25;
        }

        // Slow uniform drift down and left (standard starfield style)
        const angle = Math.PI * 0.85 + (Math.random() - 0.5) * 0.15;
        const speed = (0.05 + Math.random() * 0.1) * this.speedScale;
        this.baseVx = Math.cos(angle) * speed;
        this.baseVy = Math.sin(angle) * speed;
        this.vx = this.baseVx;
        this.vy = this.baseVy;

        this.colorIndex = Math.floor(Math.random() * STAR_COLORS.length);
        
        // Twinkling effect
        this.alpha = this.baseAlpha;
        this.twinklePhase = Math.random() * Math.PI * 2;
        this.twinkleSpeed = 0.01 + Math.random() * 0.025;
      }

      update(time) {
        // Star movement
        this.x += this.vx;
        this.y += this.vy;

        // Wrap around boundaries
        if (this.x < -20 || this.x > width + 20 || this.y < -20 || this.y > height + 20) {
          this.reset(false);
        }

        // Apply friction to returns from force pushes
        const currentSpeed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
        const baseSpeed = Math.sqrt(this.baseVx * this.baseVx + this.baseVy * this.baseVy);
        if (currentSpeed > baseSpeed) {
          this.vx *= 0.94;
          this.vy *= 0.94;
        }

        // Base twinkling using sine wave
        let alphaTarget = this.baseAlpha + Math.sin(time * this.twinkleSpeed + this.twinklePhase) * 0.18;
        alphaTarget = Math.max(0.1, Math.min(1.0, alphaTarget));

        // Blend ripple illumination back to twinkle target
        if (this.alpha > alphaTarget) {
          this.alpha -= 0.012;
        } else {
          this.alpha = alphaTarget;
        }
      }

      draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = `${STAR_COLORS[this.colorIndex]}${this.alpha.toFixed(3)})`;
        
        // Add subtle bloom glow to foreground stars
        if (this.layer === 2 && this.alpha > 0.6) {
          ctx.shadowColor = STAR_COLORS[this.colorIndex] + '0.6)';
          ctx.shadowBlur = 8;
        }
        
        ctx.fill();
        ctx.shadowBlur = 0; // Reset
      }
    }

    const adjustStarDensity = () => {
      if (stars.length < targetStarCount) {
        const diff = targetStarCount - stars.length;
        for (let i = 0; i < diff; i++) {
          stars.push(new Star(true));
        }
      } else if (stars.length > targetStarCount) {
        stars.splice(targetStarCount);
      }
    };

    // Initialize stars
    resizeCanvas();
    for (let i = 0; i < targetStarCount; i++) {
      stars.push(new Star(true));
    }

    window.addEventListener('resize', resizeCanvas);

    let time = 0;

    // Animation Loop
    const animate = () => {
      time++;
      ctx.clearRect(0, 0, width, height);

      const mouse = mouseRef.current;
      const ripples = ripplesRef.current;
      const sparkles = sparklesRef.current;

      // 1. Draw and update shockwave ripples (gas clouds / supernovas)
      for (let i = ripples.length - 1; i >= 0; i--) {
        const ripple = ripples[i];
        ripple.radius += ripple.speed;

        if (ripple.radius > ripple.maxRadius) {
          ripples.splice(i, 1);
          continue;
        }

        // Draw double shockwave rings
        const pct = ripple.radius / ripple.maxRadius;
        const opacity = (1 - pct) * 0.28;
        
        // Outer ring
        ctx.beginPath();
        ctx.arc(ripple.x, ripple.y, ripple.radius, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(165, 243, 252, ${opacity})`;
        ctx.lineWidth = 1.0;
        ctx.stroke();

        // Inner glowing gas aura
        ctx.beginPath();
        ctx.arc(ripple.x, ripple.y, ripple.radius * 0.85, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(192, 132, 252, ${opacity * 0.5})`;
        ctx.lineWidth = 2.5;
        ctx.stroke();
      }

      // 2. Draw and update click sparkles (stardust explosion)
      for (let i = sparkles.length - 1; i >= 0; i--) {
        const s = sparkles[i];
        s.x += s.vx;
        s.y += s.vy;
        s.vx *= s.friction;
        s.vy *= s.friction;
        s.alpha -= s.decay;

        if (s.alpha <= 0) {
          sparkles.splice(i, 1);
          continue;
        }

        ctx.beginPath();
        ctx.arc(s.x, s.y, s.radius, 0, Math.PI * 2);
        ctx.fillStyle = `${s.color}${s.alpha.toFixed(3)})`;
        
        // Lens flare effect for sparkles
        ctx.shadowColor = s.color + '0.8)';
        ctx.shadowBlur = 6;
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      // 3. Update stars position, handle mouse interaction & ripples
      for (let i = 0; i < stars.length; i++) {
        const star = stars[i];

        // Mouse gravity pull (only affects mid and foreground stars)
        if (mouse.active && star.layer > 0) {
          const dx = mouse.x - star.x;
          const dy = mouse.y - star.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const activeDist = 180;

          if (dist < activeDist) {
            // Gentle attraction
            const force = (1 - dist / activeDist) * 0.0006 * star.layer;
            star.vx += dx * force;
            star.vy += dy * force;
          }
        }

        // Ripple shockwave impact (pushes stars away and makes them glow)
        for (let j = 0; j < ripples.length; j++) {
          const ripple = ripples[j];
          const dx = star.x - ripple.x;
          const dy = star.y - ripple.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          const waveWidth = 35;
          if (Math.abs(dist - ripple.radius) < waveWidth) {
            const angle = Math.atan2(dy, dx);
            const intensity = (1 - ripple.radius / ripple.maxRadius);
            
            // Push outward (heavier stars react slightly less)
            const push = intensity * ripple.force * 0.18;
            star.vx += Math.cos(angle) * push;
            star.vy += Math.sin(angle) * push;

            // Illuminate star
            star.alpha = Math.min(1.0, star.alpha + intensity * 0.7);
          }
        }

        star.update(time);
        star.draw();
      }

      // 4. Draw Constellations (Lines between close foreground/midground stars)
      for (let i = 0; i < stars.length; i++) {
        const s1 = stars[i];
        if (s1.layer === 0) continue; // Skip deep background stars
        
        for (let j = i + 1; j < stars.length; j++) {
          const s2 = stars[j];
          if (s2.layer === 0) continue;

          const dx = s1.x - s2.x;
          const dy = s1.y - s2.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const maxDist = 95;

          if (dist < maxDist) {
            // Draw constellation lines
            const alphaFactor = (1 - dist / maxDist) * 0.14;
            const combinedAlpha = ((s1.alpha + s2.alpha) / 2) * alphaFactor;
            
            ctx.beginPath();
            ctx.moveTo(s1.x, s1.y);
            ctx.lineTo(s2.x, s2.y);
            ctx.strokeStyle = `rgba(165, 243, 252, ${combinedAlpha.toFixed(3)})`;
            ctx.lineWidth = s1.layer === 2 && s2.layer === 2 ? 0.8 : 0.45;
            ctx.stroke();
          }
        }

        // Draw cursor connection constellation paths
        if (mouse.active && s1.layer === 2) {
          const dx = s1.x - mouse.x;
          const dy = s1.y - mouse.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const maxMouseDist = 150;

          if (dist < maxMouseDist) {
            const alphaFactor = (1 - dist / maxMouseDist) * 0.22;
            ctx.beginPath();
            ctx.moveTo(s1.x, s1.y);
            ctx.lineTo(mouse.x, mouse.y);
            
            // Faint colored glow path
            ctx.strokeStyle = `${STAR_COLORS[s1.colorIndex]}${(s1.alpha * alphaFactor).toFixed(3)})`;
            ctx.lineWidth = 0.7;
            ctx.stroke();
          }
        }
      }

      animationFrameId = requestAnimationFrame(animate);
    };

    let isVisible = true;
    const handleVisibilityChange = () => {
      if (document.hidden) {
        isVisible = false;
        cancelAnimationFrame(animationFrameId);
      } else {
        if (!isVisible) {
          isVisible = true;
          animate();
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    animate();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  // Global mouse coordination and click ripple effect
  useEffect(() => {
    const handleMouseMove = (e) => {
      mouseRef.current.x = e.clientX;
      mouseRef.current.y = e.clientY;
      mouseRef.current.active = true;
    };

    const handleMouseLeave = () => {
      mouseRef.current.active = false;
    };

    const handleTouchStart = (e) => {
      if (e.touches.length > 0) {
        mouseRef.current.x = e.touches[0].clientX;
        mouseRef.current.y = e.touches[0].clientY;
        mouseRef.current.active = true;
      }
    };

    const handleTouchMove = (e) => {
      if (e.touches.length > 0) {
        mouseRef.current.x = e.touches[0].clientX;
        mouseRef.current.y = e.touches[0].clientY;
      }
    };

    const handleTouchEnd = () => {
      mouseRef.current.active = false;
    };

    const handleWindowClick = (e) => {
      // Spawn supernova shockwave ripple
      ripplesRef.current.push({
        x: e.clientX,
        y: e.clientY,
        radius: 0,
        maxRadius: Math.min(window.innerWidth, window.innerHeight) * 0.45,
        speed: 6.5,
        force: 10.0
      });

      // Spawn stardust sparkle blast (18-24 sparkling stars exploding outward)
      const count = 18 + Math.floor(Math.random() * 8);
      for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 1.5 + Math.random() * 3.5;
        const color = SPARKLE_COLORS[Math.floor(Math.random() * SPARKLE_COLORS.length)];
        
        sparklesRef.current.push({
          x: e.clientX,
          y: e.clientY,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          radius: 0.8 + Math.random() * 1.5,
          alpha: 1.0,
          decay: 0.015 + Math.random() * 0.02,
          friction: 0.95,
          color: color.startsWith('#') ? hexToRgb(color) : color
        });
      }
    };

    // Helper to convert hex colors to rgba for opacity manipulation
    function hexToRgb(hex) {
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      return result ? `rgba(${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}, ` : 'rgba(255,255,255,';
    }

    window.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseleave', handleMouseLeave);
    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: true });
    window.addEventListener('touchend', handleTouchEnd);
    window.addEventListener('click', handleWindowClick);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseleave', handleMouseLeave);
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
      window.removeEventListener('click', handleWindowClick);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-0 bg-[#020617]"
    />
  );
};

export default InteractiveBackground;
