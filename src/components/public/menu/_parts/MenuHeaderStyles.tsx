import React from "react";

export function MenuHeaderStyles() {
    return (
        <style>{`
            @keyframes mh-fade-in {
              from { opacity: 0; }
              to   { opacity: 1; }
            }
            @keyframes mh-logo-in {
              from { opacity: 0; transform: translateY(16px) scale(0.96); }
              to   { opacity: 1; transform: translateY(0) scale(1); }
            }
            @keyframes mh-pills-in {
              from { opacity: 0; transform: translateY(8px); }
              to   { opacity: 1; transform: translateY(0); }
            }
            @keyframes mh-ken-burns {
               0%   { transform: scale(1.1) translate(0%,    0%); }
               33%  { transform: scale(1.14) translate(-1%,  -0.5%); }
               66%  { transform: scale(1.12) translate(0.8%,  0.4%); }
               100% { transform: scale(1.1) translate(0%,    0%); }
            }
            @keyframes mh-shimmer {
              0%   { opacity: 0; transform: translateX(-100%); }
              40%  { opacity: 1; }
              100% { opacity: 0; transform: translateX(200%); }
            }
            @keyframes mh-dot-pulse {
              0%, 100% { opacity: 1; transform: scale(1); }
              50%      { opacity: 0.5; transform: scale(0.75); }
            }

            .mh-ken-burns {
              animation: mh-ken-burns 28s ease-in-out infinite;
              will-change: transform;
              transform-origin: center center;
            }

            /* Shimmer accent line */
            .mh-shimmer-line {
              background: linear-gradient(
                90deg,
                transparent 0%,
                rgba(255,255,255,0.0) 20%,
                rgba(255,255,255,0.55) 50%,
                rgba(255,255,255,0.0) 80%,
                transparent 100%
              );
              animation: mh-shimmer 5s 1.5s cubic-bezier(0.4,0,0.6,1) infinite;
            }

            /* Pulsing dot for live rate */
            .mh-pulse {
              animation: mh-dot-pulse 2s ease-in-out infinite;
            }

            /* Unified glassmorphism button */
            .mh-glass-btn {
              background: rgba(255,255,255,0.10);
              backdrop-filter: blur(20px) saturate(1.6);
              -webkit-backdrop-filter: blur(20px) saturate(1.6);
              border: 1px solid rgba(255,255,255,0.14);
              box-shadow:
                0 2px 8px rgba(0,0,0,0.18),
                inset 0 1px 0 rgba(255,255,255,0.10);
              transition: background 0.2s ease, border-color 0.2s ease, transform 0.15s ease, box-shadow 0.2s ease;
            }
            .mh-glass-btn:hover {
              background: rgba(255,255,255,0.16);
              border-color: rgba(255,255,255,0.22);
              box-shadow:
                0 4px 16px rgba(0,0,0,0.22),
                inset 0 1px 0 rgba(255,255,255,0.14);
            }
            .mh-glass-btn:active {
              transform: scale(0.94);
              background: rgba(255,255,255,0.18);
            }

            /* Metadata chip — frosted glass */
            .mh-meta-chip {
              background: rgba(0,0,0,0.28);
              backdrop-filter: blur(16px) saturate(1.3);
              -webkit-backdrop-filter: blur(16px) saturate(1.3);
              border: 1px solid rgba(255,255,255,0.10);
              box-shadow:
                0 2px 12px rgba(0,0,0,0.15),
                inset 0 1px 0 rgba(255,255,255,0.06);
            }

            /* Pills bar */
            .mh-pills-bar {
              background: var(--bg-card);
              border-bottom: 1px solid var(--border);
              box-shadow: 0 2px 8px rgba(var(--shadow-color), 0.04);
            }

            /* Premium pill styles */
            .mh-pill {
              position: relative;
              border-radius: 999px;
              padding: 10px 20px;
              font-size: clamp(13px, 3.5vw, 14.5px);
              font-weight: 600;
              white-space: nowrap;
              flex-shrink: 0;
              border: 1.5px solid transparent;
              cursor: pointer;
              transition: all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
              outline: none;
              letter-spacing: 0.015em;
              -webkit-tap-highlight-color: transparent;
            }

            /* Desktop pill sizing — more spacious */
            @media (min-width: 1024px) {
              .mh-pill {
                padding: 12px 24px;
                font-size: 15px;
                letter-spacing: 0.02em;
              }
            }

            .mh-pill[data-active="false"] {
              background: var(--surface-section);
              color: var(--ink);
              border-color: var(--border);
            }
            .mh-pill[data-active="false"]:hover {
              background: var(--bg-app);
              transform: translateY(-1px);
              box-shadow: 0 2px 8px rgba(var(--shadow-color), 0.08);
            }
            .mh-pill[data-active="false"]:active {
              background: var(--border-ghost);
              transform: scale(0.95);
            }
            .mh-pill[data-active="true"] {
              background: linear-gradient(135deg, #bb0005 0%, #e2231a 100%);
              color: #fff;
              font-weight: 750;
              border-color: rgba(255,255,255,0.10);
              box-shadow: 0 4px 12px rgba(187, 0, 5, 0.20);
              transition: all 0.2s ease;
            }
            .mh-pill[data-active="true"]:active {
              transform: scale(0.97);
            }

            /* Hide webkit scrollbar */
            .mh-pills-scroll::-webkit-scrollbar { display: none; }
        `}</style>
    );
}
