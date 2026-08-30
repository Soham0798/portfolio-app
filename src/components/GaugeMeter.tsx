'use client';

import { useEffect, useRef, useState } from 'react';

// Geometry — matches the reference design scaled to 160×125
const CX = 80, CY = 70, R = 62;
const START = -135, END = 135; // 270° sweep, gap at bottom

function polar(cx: number, cy: number, r: number, deg: number) {
  const a = (deg - 90) * (Math.PI / 180);
  return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
}
function arc(cx: number, cy: number, r: number, a0: number, a1: number) {
  const s = polar(cx, cy, r, a0);
  const e = polar(cx, cy, r, a1);
  const lg = a1 - a0 > 180 ? 1 : 0;
  return `M ${s.x.toFixed(2)} ${s.y.toFixed(2)} A ${r} ${r} 0 ${lg} 1 ${e.x.toFixed(2)} ${e.y.toFixed(2)}`;
}

const TRACK = arc(CX, CY, R, START, END);

export default function GaugeMeter({ score }: { score: number }) {
  const [display, setDisplay] = useState(0);
  const pathRef = useRef<SVGPathElement>(null);

  // Count-up
  useEffect(() => {
    setDisplay(0);
    let frame: number;
    const t0 = performance.now();
    const dur = 900;
    const tick = (now: number) => {
      const t = Math.min(1, (now - t0) / dur);
      setDisplay(Math.round(score * (1 - Math.pow(1 - t, 3))));
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [score]);

  // Arc draw — start hidden, then transition to filled
  useEffect(() => {
    const el = pathRef.current;
    if (!el) return;
    const total = el.getTotalLength();
    const filled = total * (score / 100);

    el.style.transition = 'none';
    el.style.strokeDasharray = String(total);
    el.style.strokeDashoffset = String(total); // fully hidden

    // reflow then animate
    void el.getBoundingClientRect();
    requestAnimationFrame(() => {
      el.style.transition = 'stroke-dashoffset 1.1s cubic-bezier(0.3, 0.8, 0.3, 1)';
      el.style.strokeDashoffset = String(total - filled); // reveal
    });
  }, [score]);

  const rank = score >= 80 ? 'Excellent' : score >= 60 ? 'Steady' : 'Needs work';
  const rankColor = score >= 80 ? '#1E8E68' : score >= 60 ? '#d97706' : '#dc2626';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      {/* SVG gauge */}
      <div style={{ position: 'relative', width: '160px', height: '125px' }}>
        <svg
          width="160"
          height="125"
          viewBox="0 0 160 125"
          style={{ display: 'block' }}
        >
          <defs>
            <linearGradient id="gg" x1="0%" y1="100%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#3457D5" />
              <stop offset="100%" stopColor="#1E8E68" />
            </linearGradient>
          </defs>
          {/* Track */}
          <path d={TRACK} fill="none" stroke="var(--border-subtle, #E4E7EF)" strokeWidth="13" strokeLinecap="round" />
          {/* Filled arc */}
          <path ref={pathRef} d={TRACK} fill="none" stroke="url(#gg)" strokeWidth="13" strokeLinecap="round" />
        </svg>

        {/* Centered score */}
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          paddingBottom: '18px', // nudge up into arc center visually
        }}>
          <span style={{
            fontFamily: "'Fraunces', 'DM Serif Display', Georgia, serif",
            fontWeight: 600, fontSize: '46px', lineHeight: 1,
            color: 'var(--text-primary)',
          }}>{display}</span>
          <span style={{
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: '11px', color: 'var(--text-muted)',
            marginTop: '4px', letterSpacing: '0.05em',
          }}>OUT OF 100</span>
        </div>
      </div>

      {/* Scale labels */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', width: '160px',
        marginTop: '0px',
        fontFamily: "'IBM Plex Mono', monospace",
        fontSize: '9px', letterSpacing: '0.06em',
        color: 'var(--text-muted)', textTransform: 'uppercase',
      }}>
        <span>Needs work</span><span>Excellent</span>
      </div>

      {/* Rank */}
      <div style={{
        marginTop: '10px',
        fontFamily: "'Fraunces', 'DM Serif Display', Georgia, serif",
        fontWeight: 600, fontSize: '18px', color: rankColor,
      }}>{rank}</div>
    </div>
  );
}
