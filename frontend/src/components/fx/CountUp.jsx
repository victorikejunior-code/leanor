import { useEffect, useRef, useState } from "react";

const reduced = () =>
  typeof window !== "undefined" &&
  Boolean(window.matchMedia?.("(prefers-reduced-motion: reduce)").matches);

/**
 * Counts up to `to` the first time it scrolls into view.
 *
 * The final value is rendered immediately on the server / on first paint and
 * only then rewound, so the number is never missing for readers with
 * animation disabled or without IntersectionObserver.
 */
export default function CountUp({ to, duration = 1300, suffix = "" }) {
  const ref = useRef(null);
  const [value, setValue] = useState(to);

  useEffect(() => {
    const node = ref.current;
    if (!node) return undefined;
    if (reduced() || typeof IntersectionObserver === "undefined") return undefined;

    let frame = 0;
    setValue(0);

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        observer.disconnect();

        const start = performance.now();
        const step = (now) => {
          const t = Math.min(1, (now - start) / duration);
          // easeOutCubic — fast at first, then settles
          const eased = 1 - Math.pow(1 - t, 3);
          setValue(Math.round(to * eased));
          if (t < 1) frame = requestAnimationFrame(step);
        };
        frame = requestAnimationFrame(step);
      },
      { threshold: 0.4 },
    );

    observer.observe(node);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [to, duration]);

  return (
    <span ref={ref} className="fx-num">
      {value.toLocaleString()}
      {suffix}
    </span>
  );
}
