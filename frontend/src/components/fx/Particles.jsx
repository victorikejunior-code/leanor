import { useEffect, useRef } from "react";

/**
 * Slow-drifting light particles behind the hero copy.
 *
 * Renders a single <canvas> sized to its parent; content never depends on
 * it (it is purely decorative and pointer-transparent). Under
 * prefers-reduced-motion nothing is drawn and the loop never starts.
 */
export default function Particles({ density = 16 }) {
  const ref = useRef(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return undefined;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
      return undefined;
    }
    const ctx = canvas.getContext("2d");
    if (!ctx) return undefined;

    const COLORS = [
      "rgba(255, 255, 255,",
      "rgba(147, 197, 253,",
      "rgba(252, 165, 165,",
    ];

    let width = 0;
    let height = 0;
    let bits = [];

    const make = () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      r: 0.8 + Math.random() * 2.2,
      vy: 0.06 + Math.random() * 0.24,
      phase: Math.random() * Math.PI * 2,
      speed: 0.003 + Math.random() * 0.009,
      alpha: 0.16 + Math.random() * 0.48,
      color: COLORS[(Math.random() * COLORS.length) | 0],
    });

    const resize = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      width = parent.clientWidth;
      height = parent.clientHeight;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.max(1, Math.round(width * dpr));
      canvas.height = Math.max(1, Math.round(height * dpr));
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const target = Math.max(28, Math.min(90, Math.round(width / density)));
      bits = Array.from({ length: target }, make);
    };

    resize();

    let raf = 0;
    let last = performance.now();

    const tick = (now) => {
      const delta = Math.min(48, now - last);
      last = now;
      ctx.clearRect(0, 0, width, height);

      for (const bit of bits) {
        bit.y -= bit.vy * (delta / 16);
        bit.phase += bit.speed * delta;
        if (bit.y < -8) {
          bit.y = height + 8;
          bit.x = Math.random() * width;
        }
        const x = bit.x + Math.sin(bit.phase) * 14;
        const twinkle = 0.7 + 0.3 * Math.sin(bit.phase * 2);
        ctx.beginPath();
        ctx.fillStyle = `${bit.color}${(bit.alpha * twinkle).toFixed(3)})`;
        ctx.arc(x, bit.y, bit.r, 0, Math.PI * 2);
        ctx.fill();
      }

      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    window.addEventListener("resize", resize);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, [density]);

  return <canvas ref={ref} className="fx-particles" aria-hidden="true" />;
}
