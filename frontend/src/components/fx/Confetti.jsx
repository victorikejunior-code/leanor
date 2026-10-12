import { useEffect, useRef } from "react";

const COLORS = ["#3b82f6", "#ef4444", "#93c5fd", "#fca5a5", "#ffffff", "#dc2626"];

/**
 * A one-shot confetti burst over the viewport — rendered only while the
 * success card is on screen, and skipped entirely under reduced motion.
 * Purely decorative: it never intercepts pointer events.
 */
export default function Confetti({ fire = 0 }) {
  const ref = useRef(null);

  useEffect(() => {
    if (!fire) return undefined;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
      return undefined;
    }

    const canvas = ref.current;
    if (!canvas) return undefined;
    const ctx = canvas.getContext("2d");
    if (!ctx) return undefined;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = window.innerWidth;
    const h = window.innerHeight;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // Two symmetric bursts from just above the middle of the screen.
    const spawn = () => {
      const pieces = [];
      const originX = w / 2;
      const originY = h * 0.34;
      for (let i = 0; i < 110; i += 1) {
        const angle = -Math.PI / 2 + (Math.random() - 0.5) * 2.1;
        const speed = 5 + Math.random() * 9;
        pieces.push({
          x: originX + (Math.random() - 0.5) * 90,
          y: originY + (Math.random() - 0.5) * 40,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          rot: Math.random() * Math.PI,
          vr: (Math.random() - 0.5) * 0.32,
          w: 6 + Math.random() * 6,
          h: 9 + Math.random() * 7,
          color: COLORS[(Math.random() * COLORS.length) | 0],
          life: 1,
        });
      }
      return pieces;
    };

    const pieces = spawn();
    let raf = 0;
    const start = performance.now();

    const draw = (now) => {
      const elapsed = now - start;
      ctx.clearRect(0, 0, w, h);

      for (const p of pieces) {
        p.vy += 0.22;          // gravity
        p.vx *= 0.99;          // drag
        p.x += p.vx;
        p.y += p.vy;
        p.rot += p.vr;
        if (elapsed > 1400) p.life -= 0.02;
        if (p.life <= 0) continue;

        ctx.save();
        ctx.globalAlpha = Math.max(0, p.life);
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.restore();
      }

      if (elapsed < 3000) {
        raf = requestAnimationFrame(draw);
      } else {
        ctx.clearRect(0, 0, w, h);
      }
    };

    raf = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(raf);
      ctx.clearRect(0, 0, w, h);
    };
  }, [fire]);

  if (!fire) return null;
  return <canvas ref={ref} className="fx-confetti" aria-hidden="true" />;
}
