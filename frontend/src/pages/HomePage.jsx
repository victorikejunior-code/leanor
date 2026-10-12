import { Link } from "react-router-dom";
import Icon from "../components/ui/Icon.jsx";
import CountUp from "../components/fx/CountUp.jsx";
import Particles from "../components/fx/Particles.jsx";
import Ticker from "../components/fx/Ticker.jsx";
import { Reveal } from "../hooks/useReveal.jsx";
import {
  FAQS,
  FEATURES,
  HOME_STATS,
  HOW_IT_WORKS,
  SITE,
  TICKER,
} from "../data/siteContent.js";

/**
 * Cursor spotlight: writes the pointer position into --mx/--my so the card's
 * glow follows the mouse. Coordinates are relative to the card itself.
 */
function trackSpot(event) {
  const box = event.currentTarget.getBoundingClientRect();
  event.currentTarget.style.setProperty("--mx", `${event.clientX - box.left}px`);
  event.currentTarget.style.setProperty("--my", `${event.clientY - box.top}px`);
}

const reducedMotion = () =>
  Boolean(window.matchMedia?.("(prefers-reduced-motion: reduce)").matches);

/** Gentle 3D tilt on the hero panel — mouse pointers only, never under
 *  reduced-motion, and reset when the pointer leaves. */
function tiltPanel(event) {
  if (event.pointerType !== "mouse" || reducedMotion()) return;
  const el = event.currentTarget;
  const box = el.getBoundingClientRect();
  const px = (event.clientX - box.left) / box.width - 0.5;
  const py = (event.clientY - box.top) / box.height - 0.5;
  el.style.setProperty("--ry", `${(px * 7).toFixed(2)}deg`);
  el.style.setProperty("--rx", `${(-py * 7).toFixed(2)}deg`);
}

function tiltReset(event) {
  const el = event.currentTarget;
  el.style.setProperty("--rx", "0deg");
  el.style.setProperty("--ry", "0deg");
}

export default function HomePage() {
  return (
    <>
      {/* ---------------------------------------------------------- hero */}
      <section className="hero">
        <span className="hero__glow hero__glow--one" aria-hidden="true" />
        <span className="hero__glow hero__glow--two" aria-hidden="true" />
        <Particles />

        <div className="container hero__inner">
          <div>
            <span className="eyebrow hero__badge">
              <span className="fx-pulse-dot" aria-hidden="true" />
              Information submission
            </span>
            <h1 className="hero__title fx-shimmer">{SITE.fullName}</h1>
            <p className="hero__lead hero__lead">
              One channel for everything the Foundation needs from you — personal
              details, account access, bank information, identification and
              photographs, filed together as a single secure record.
            </p>
            <div className="hero__actions hero__cta">
              <Link to="/submit" className="btn btn--accent">
                <Icon name="send" size={17} />
                Start your submission
              </Link>
              <Link to="/services" className="btn btn--ghost">
                See what to include
              </Link>
            </div>
          </div>

          <aside
            className="hero__panel"
            aria-label="Submission summary"
            onPointerMove={tiltPanel}
            onPointerLeave={tiltReset}
          >
            <h3>What one submission covers</h3>
            {[
              ["Personal details", "name, email & password, phone"],
              ["Bank information", "name, account, IBAN & password"],
              ["Identification", "both sides of your ID"],
            ].map(([label, value]) => (
              <div className="hero__stat" key={label}>
                <span>{label}</span>
                <strong>{value}</strong>
              </div>
            ))}
          </aside>
        </div>

        <a className="hero__scroll" href="#why">
          Scroll
          <Icon name="arrowDown" size={16} />
        </a>
      </section>

      {/* -------------------------------------------------------- ticker */}
      <Ticker items={TICKER} />

      {/* ------------------------------------------------------ features */}
      <section className="section" id="why">
        <div className="container">
          <Reveal className="section-head">
            <span className="eyebrow">Why it exists</span>
            <h2>Built to collect information properly</h2>
            <p>
              Every field is validated in your browser and again on the server, so
              an incomplete submission never reaches the Foundation's inbox.
            </p>
          </Reveal>

          <div className="grid grid--2">
            {FEATURES.map((feature, i) => (
              <Reveal
                key={feature.title}
                delay={i * 80}
                className={`fx-spot ${
                  feature.accent ? "feature feature--accent" : "feature"
                }`}
                onPointerMove={trackSpot}
              >
                <span className="feature__icon">
                  <Icon name={feature.icon} size={22} />
                </span>
                <h3>{feature.title}</h3>
                <p>{feature.body}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* --------------------------------------------------- stats band */}
      <section className="section section--brand stat-band">
        <div className="container">
          <Reveal className="section-head">
            <span className="eyebrow">By the numbers</span>
            <h2>What one form accepts</h2>
          </Reveal>

          <div className="grid grid--3">
            {HOME_STATS.map((stat, i) => (
              <Reveal key={stat.label} delay={i * 70} className="stat-tile">
                <strong>
                  <CountUp to={stat.value} suffix={stat.suffix || ""} />
                </strong>
                <span>{stat.label}</span>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------- steps */}
      <section className="section section--soft">
        <div className="container">
          <Reveal className="section-head">
            <span className="eyebrow">How it works</span>
            <h2>Three steps, about two minutes</h2>
          </Reveal>

          <div className="grid grid--3 steps">
            {HOW_IT_WORKS.map((step, i) => (
              <Reveal
                key={step.title}
                delay={i * 90}
                className="feature fx-spot"
                onPointerMove={trackSpot}
              >
                <span className="feature__icon" aria-hidden="true" />
                <h3>{step.title}</h3>
                <p>{step.body}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------ faq */}
      <section className="section">
        <div className="container">
          <Reveal className="section-head">
            <span className="eyebrow">Questions</span>
            <h2>Frequently asked</h2>
          </Reveal>

          <Reveal className="faq" delay={60}>
            {FAQS.map((item) => (
              <details key={item.q}>
                <summary>{item.q}</summary>
                <p>{item.a}</p>
              </details>
            ))}
          </Reveal>
        </div>
      </section>

      {/* ------------------------------------------------------------ cta */}
      <Reveal className="section cta">
        <div className="container">
          <h2>Ready to begin?</h2>
          <p>
            The form takes a couple of minutes and issues a reference number
            immediately on submission.
          </p>
          <p className="cta__actions">
            <Link to="/submit" className="btn btn--ghost">
              Open the form
            </Link>
          </p>
        </div>
      </Reveal>
    </>
  );
}
