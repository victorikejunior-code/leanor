import { useEffect, useRef, useState } from "react";
import Icon from "../ui/Icon.jsx";

const RADIUS = 15;
const CIRC = 2 * Math.PI * RADIUS;

/**
 * Floating "back to top" button with a scroll-progress ring.
 * Appears once the visitor has moved down the page; the ring fills as they
 * approach the bottom. rAF-throttled to one read per frame.
 */
export default function BackToTop() {
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);
  const ticking = useRef(false);

  useEffect(() => {
    const read = () => {
      ticking.current = false;
      const y = window.scrollY;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      setProgress(max > 0 ? Math.min(1, y / max) : 0);
      setVisible(y > 480);
    };

    const onScroll = () => {
      if (ticking.current) return;
      ticking.current = true;
      requestAnimationFrame(read);
    };

    read();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  const toTop = () => {
    const behavior = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
      ? "auto"
      : "smooth";
    window.scrollTo({ top: 0, behavior });
  };

  return (
    <button
      type="button"
      className={visible ? "to-top to-top--on" : "to-top"}
      onClick={toTop}
      aria-label="Back to top"
      aria-hidden={!visible}
      tabIndex={visible ? 0 : -1}
    >
      <svg className="to-top__ring" viewBox="0 0 36 36" aria-hidden="true">
        <circle className="to-top__track" cx="18" cy="18" r={RADIUS} />
        <circle
          className="to-top__bar"
          cx="18"
          cy="18"
          r={RADIUS}
          strokeDasharray={CIRC}
          strokeDashoffset={CIRC * (1 - progress)}
        />
      </svg>
      <Icon name="arrowUp" size={18} className="to-top__arrow" />
    </button>
  );
}
