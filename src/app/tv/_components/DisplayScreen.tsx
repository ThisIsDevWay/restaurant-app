"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { MenuBoardSlide, type MenuBoardData } from "./MenuBoardSlide";

export type ContentItem = {
  id: string;
  type: "image" | "video" | "menu_board";
  /** URL only set for image/video. */
  url?: string;
  durationSeconds: number;
  muted: boolean;
  /** Only set when type === "menu_board". */
  menuBoard?: MenuBoardData;
};

export type ContentResponse = {
  displayId: string;
  name: string;
  orientation: "auto" | "landscape" | "portrait";
  rotationDegrees: 0 | 90 | 180 | 270 | number;
  audioEnabled: boolean;
  volumePercent: number;
  source: "default" | "event";
  eventId: string | null;
  eventName: string | null;
  items: ContentItem[];
  version: string;
  restaurantName?: string | null;
  logoUrl?: string | null;
};

type Props = {
  content: ContentResponse | null;
  reconnecting?: boolean;
  /** True after the user has interacted at least once (autoplay-with-sound is allowed). */
  audioUnlocked: boolean;
  /** Callback the unlock-prompt overlay invokes when tapped. */
  onUnlockAudio: () => void;
};

/**
 * Full-screen carousel. Cross-fades between items, advances images on a
 * duration timer and videos on `onEnded`.
 *
 * Orientation handling:
 *   - "auto"      -> no base rotation
 *   - "landscape" -> if device is portrait, rotate -90 to force landscape
 *   - "portrait"  -> if device is landscape, rotate +90 to force portrait
 *   - rotationDegrees adds extra rotation (0/90/180/270)
 *
 * The rotation must be applied to a separate WRAPPER div with explicit
 * width/height/top/left -- it cannot share an element with `inset: 0`
 * because in that case the inset wins and the dimensions are ignored.
 */
export function DisplayScreen({
  content,
  reconnecting,
  audioUnlocked,
  onUnlockAudio,
}: Props) {
  const items = useMemo(() => content?.items ?? [], [content?.items]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const audioEnabled = content?.audioEnabled ?? false;
  const volumePercent = content?.volumePercent ?? 80;

  const [introDone, setIntroDone] = useState(false);
  const hasStartedIntro = useRef(false);

  useEffect(() => {
    if (items.length === 0) {
      setIntroDone(false);
      hasStartedIntro.current = false;
      return;
    }

    if (!hasStartedIntro.current) {
      hasStartedIntro.current = true;
      const timer = setTimeout(() => {
        setIntroDone(true);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [items.length]);

  // Should the CURRENT item play with sound?
  const currentItem = items[currentIdx];
  const wantsSound =
    audioEnabled &&
    audioUnlocked &&
    introDone &&
    !!currentItem &&
    currentItem.type === "video" &&
    !currentItem.muted;
  // Show "tap for sound" overlay when audio is desired but blocked.
  const audioBlocked =
    audioEnabled &&
    !audioUnlocked &&
    items.some((i) => i.type === "video" && !i.muted);

  // Track viewport so the rotation transform recomputes on resize / rotation.
  const [viewport, setViewport] = useState(() => readViewport());
  useEffect(() => {
    if (typeof window === "undefined") return;
    const update = () => setViewport(readViewport());
    window.addEventListener("resize", update);
    window.addEventListener("orientationchange", update);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("orientationchange", update);
    };
  }, []);

  // Reset index if we now have fewer items than before.
  useEffect(() => {
    if (items.length === 0) {
      setCurrentIdx(0);
      return;
    }
    setCurrentIdx((i) => (i >= items.length ? 0 : i));
  }, [items.length]);

  // Advance images & menu boards on a timer. Videos also have a fallback timer
  // (durationSeconds + 5s grace) in case `onEnded` never fires.
  useEffect(() => {
    if (items.length === 0 || !introDone) return;
    const item = items[currentIdx];
    if (!item) return;
    const advance = () =>
      setCurrentIdx((i) => (i + 1) % Math.max(1, items.length));
    if (item.type === "image" || item.type === "menu_board") {
      const ms = Math.max(1, item.durationSeconds) * 1000;
      const id = window.setTimeout(advance, ms);
      return () => window.clearTimeout(id);
    }
    const fallbackMs = (Math.max(1, item.durationSeconds) + 5) * 1000;
    const id = window.setTimeout(advance, fallbackMs);
    return () => window.clearTimeout(id);
  }, [currentIdx, items, introDone]);

  const wrapperStyle = useMemo<React.CSSProperties>(() => {
    return computeRotationWrapper(
      content?.orientation ?? "auto",
      content?.rotationDegrees ?? 0,
      viewport,
    );
  }, [content?.orientation, content?.rotationDegrees, viewport]);


  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        background: "#000",
        overflow: "hidden",
      }}
    >
      {/* Rotated wrapper: explicit width/height/top/left, no `inset` here */}
      <div style={{ position: "absolute", ...wrapperStyle }}>
        {!content ? null : (
          <>
            {/* EmptyState (Intro/Bienvenidos) */}
            <div
              style={{
                position: "absolute",
                inset: 0,
                opacity: (items.length === 0 || !introDone) ? 1 : 0,
                transition: "opacity 800ms ease-in-out",
                pointerEvents: (items.length === 0 || !introDone) ? "auto" : "none",
                zIndex: (items.length === 0 || !introDone) ? 2 : 1,
              }}
            >
              <EmptyState
                reconnecting={reconnecting}
                restaurantName={content.restaurantName}
                logoUrl={content.logoUrl}
              />
            </div>

            {/* Carousel (Media) */}
            {items.length > 0 && (
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  opacity: introDone ? 1 : 0,
                  transition: "opacity 800ms ease-in-out",
                  pointerEvents: introDone ? "auto" : "none",
                  zIndex: introDone ? 2 : 1,
                }}
              >
                <Carousel
                  items={items}
                  currentIdx={currentIdx}
                  wantsSound={wantsSound}
                  volume={volumePercent / 100}
                  introDone={introDone}
                  onAdvance={() =>
                    setCurrentIdx((i) => (i + 1) % items.length)
                  }
                />
              </div>
            )}
          </>
        )}
      </div>

      {audioBlocked && (
        <button
          type="button"
          onClick={onUnlockAudio}
          style={{
            position: "absolute",
            top: "2vh",
            left: "2vw",
            background: "rgba(245, 158, 11, 0.95)",
            color: "#000",
            border: "none",
            padding: "0.8em 1.2em",
            borderRadius: "999px",
            fontSize: "clamp(0.8rem, 1.4vw, 1.1rem)",
            fontWeight: 600,
            fontFamily: "system-ui, sans-serif",
            cursor: "pointer",
            zIndex: 20,
            boxShadow: "0 4px 16px rgba(0,0,0,0.4)",
            display: "inline-flex",
            alignItems: "center",
            gap: "0.5em",
          }}
        >
          🔊 Toca para activar el sonido
        </button>
      )}

      {reconnecting && items.length > 0 && (
        <div
          style={{
            position: "absolute",
            top: "2vh",
            right: "2vw",
            background: "rgba(0,0,0,0.6)",
            color: "rgba(255,255,255,0.7)",
            padding: "0.6em 1em",
            borderRadius: "999px",
            fontSize: "clamp(0.7rem, 1.1vw, 0.95rem)",
            fontFamily: "system-ui, sans-serif",
            zIndex: 10,
          }}
        >
          Reconectando…
        </div>
      )}
    </div>
  );
}

/* ───────────────────────── Carousel ───────────────────────── */

function Carousel({
  items,
  currentIdx,
  wantsSound,
  volume,
  introDone,
  onAdvance,
}: {
  items: ContentItem[];
  currentIdx: number;
  wantsSound: boolean;
  volume: number;
  introDone: boolean;
  onAdvance: () => void;
}) {
  return (
    <>
      {items.map((item, i) => {
        const isCurrent = i === currentIdx;
        const isNext = i === (currentIdx + 1) % items.length;
        const shouldRender = isCurrent || isNext;
        return (
          <div
            key={item.id}
            style={{
              position: "absolute",
              inset: 0,
              opacity: isCurrent ? 1 : 0,
              transition: "opacity 600ms ease-in-out",
              pointerEvents: "none",
            }}
          >
            {shouldRender ? (
              item.type === "menu_board" && item.menuBoard ? (
                <MenuBoardSlide data={item.menuBoard} />
              ) : item.type === "image" && item.url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={item.url}
                  alt=""
                  style={{
                    width: "100%",
                    height: "100%",
                    // `contain` letterboxes/pillarboxes mixed-aspect content
                    // (16:9 vs 9:16) instead of cropping it.
                    objectFit: "contain",
                    background: "#000",
                    display: "block",
                  }}
                  draggable={false}
                />
              ) : item.type === "video" && item.url ? (
                <VideoSlide
                  src={item.url}
                  active={isCurrent && introDone}
                  muted={!isCurrent || item.muted || !wantsSound}
                  volume={volume}
                  onEnded={onAdvance}
                />
              ) : null
            ) : null}
          </div>
        );
      })}
    </>
  );
}

/* ───────────────────────── Empty State ───────────────────────── */

function EmptyState({
  reconnecting,
  restaurantName,
  logoUrl,
}: {
  reconnecting?: boolean;
  restaurantName?: string | null;
  logoUrl?: string | null;
}) {
  // Measure our OWN box. Because we live inside the rotation wrapper (which is
  // sized + rotated per the display's ORIENTACIÓN FÍSICA), clientWidth/Height
  // already reflect the true visual area — no viewport math, no double-rotation.
  const rootRef = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState<{ w: number; h: number } | null>(null);
  const [logoLoaded, setLogoLoaded] = useState(false);

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const measure = () => setBox({ w: el.clientWidth, h: el.clientHeight });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (!logoUrl) {
      setLogoLoaded(true);
      return;
    }
    setLogoLoaded(false);
    const img = new Image();
    img.src = logoUrl;
    img.onload = () => setLogoLoaded(true);
    img.onerror = () => setLogoLoaded(true);
  }, [logoUrl]);

  const w = box?.w ?? 0;
  const h = box?.h ?? 0;
  const ready = w > 0 && h > 0;
  const isPortrait = h > w;
  const short = Math.min(w, h);

  // px helpers relative to the measured box
  const px = (n: number) => `${n.toFixed(1)}px`;
  const S = (pct: number) => px(short * pct / 100); // % of short side
  const W = (pct: number) => px(w * pct / 100);     // % of width
  const H = (pct: number) => px(h * pct / 100);     // % of height

  const name = restaurantName?.trim() || null;
  // The name is the hero when present; otherwise "Bienvenidos" takes the lead.
  // Scale the hero down for longer names so it never breaks mid-word awkwardly.
  const heroLen = (name ?? "Bienvenidos").length;
  const heroBase = isPortrait ? 10 : 12;
  const heroFontPct = heroLen > 14 ? heroBase * 0.7 : heroLen > 9 ? heroBase * 0.85 : heroBase;
  const subFontPct = isPortrait ? 3.6 : 3;

  return (
    <div
      ref={rootRef}
      style={{
        position: "absolute",
        inset: 0,
        overflow: "hidden",
        background:
          "radial-gradient(ellipse at 50% 42%, #15110a 0%, #0a0809 45%, #060507 100%)",
        fontFamily: "'Georgia', 'Times New Roman', serif",
      }}
    >
      <style>{`
        @keyframes tv-shimmer { 0% { background-position: -200% center; } 100% { background-position: 200% center; } }
        @keyframes tv-fade { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes tv-glow { 0%,100% { opacity: .10; transform: scale(1); } 50% { opacity: .18; transform: scale(1.08); } }
      `}</style>

      {ready && logoLoaded && (
        <>
          {/* Ambient glow */}
          <div style={{
            position: "absolute",
            top: "50%", left: "50%",
            transform: "translate(-50%, -50%)",
            width: S(110), height: S(110),
            borderRadius: "50%",
            background: "radial-gradient(circle, #9c6a08 0%, transparent 62%)",
            animation: "tv-glow 9s ease-in-out infinite",
            pointerEvents: "none",
          }} />

          {/* Content */}
          <div style={{
            position: "absolute", inset: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            textAlign: "center",
            gap: isPortrait ? H(3.5) : H(5),
            padding: isPortrait ? `${H(8)} ${W(8)}` : `${H(8)} ${W(10)}`,
          }}>

            {/* Logo */}
            {logoUrl && (
              <div style={{ animation: "tv-fade 1s ease both", opacity: 0, marginBottom: S(1) }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={logoUrl} alt="" draggable={false} style={{
                  height: S(isPortrait ? 24 : 32),
                  maxWidth: W(isPortrait ? 85 : 55),
                  objectFit: "contain",
                  filter: "drop-shadow(0 0 24px rgba(200,150,12,0.35))",
                }} />
              </div>
            )}

            {/* Hero: restaurant name, or Bienvenidos if no name */}
            <div style={{
              fontSize: S(heroFontPct),
              fontWeight: 700,
              letterSpacing: "0.05em",
              lineHeight: 1.08,
              maxWidth: W(86),
              overflowWrap: "break-word",
              background: "linear-gradient(135deg, #fbf0cf 0%, #d6a416 28%, #fbf0cf 55%, #b8860b 80%, #fbf0cf 100%)",
              backgroundSize: "200% auto",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
              animation: "tv-fade 1.1s ease both, tv-shimmer 7s linear 1.4s infinite",
              animationDelay: "0.25s",
              opacity: 0,
              textTransform: name ? "none" : "uppercase",
            }}>
              {name ?? "Bienvenidos"}
            </div>

            {/* Divider with diamond */}
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "center",
              gap: S(2),
              width: isPortrait ? W(64) : W(34),
              animation: "tv-fade 1.1s ease both",
              animationDelay: "0.55s",
              opacity: 0,
            }}>
              <span style={{ flex: 1, height: "1px", background: "linear-gradient(to right, transparent, rgba(214,164,22,0.55))" }} />
              <span style={{ fontSize: S(2), color: "rgba(214,164,22,0.7)", lineHeight: 1, flexShrink: 0 }}>✦</span>
              <span style={{ flex: 1, height: "1px", background: "linear-gradient(to left, transparent, rgba(214,164,22,0.55))" }} />
            </div>

            {/* Tagline — only shown when the name is the hero (avoids duplication) */}
            {name && (
              <div style={{
                fontSize: S(subFontPct),
                fontWeight: 300,
                color: "rgba(255,255,255,0.62)",
                letterSpacing: "0.32em",
                textTransform: "uppercase",
                fontFamily: "system-ui, sans-serif",
                animation: "tv-fade 1.1s ease both",
                animationDelay: "0.8s",
                opacity: 0,
              }}>Bienvenidos</div>
            )}

          </div>

          {reconnecting && (
            <div style={{
              position: "absolute", bottom: H(3), left: 0, right: 0,
              textAlign: "center",
              fontSize: S(1.4),
              color: "rgba(255,255,255,0.22)",
              letterSpacing: "0.12em",
              fontFamily: "system-ui, sans-serif",
            }}>Reconectando…</div>
          )}
        </>
      )}
    </div>
  );
}

/* ───────────────────────── Video Slide ───────────────────────── */

function VideoSlide({
  src,
  active,
  muted,
  volume,
  onEnded,
}: {
  src: string;
  active: boolean;
  muted: boolean;
  volume: number;
  onEnded: () => void;
}) {
  const ref = useRef<HTMLVideoElement>(null);

  // Apply mute/volume changes on the fly (e.g. when user unlocks audio
  // while a video is mid-playback).
  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    v.muted = muted;
    v.volume = Math.max(0, Math.min(1, volume));
  }, [muted, volume]);

  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    if (active) {
      v.currentTime = 0;
      // Always start muted to satisfy autoplay; flip to unmuted in the
      // attribute effect above which runs every render with current `muted`.
      const tryPlay = () => {
        const p = v.play();
        if (p && typeof p.catch === "function") {
          p.catch(() => {
            // Autoplay-with-sound was blocked. Mute and retry.
            v.muted = true;
            v.play().catch(() => {});
          });
        }
      };
      tryPlay();
    } else {
      v.pause();
    }
  }, [active, src]);

  return (
    <video
      ref={ref}
      src={src}
      autoPlay={active}
      muted={muted}
      playsInline
      preload="auto"
      onEnded={onEnded}
      onError={() => {
        if (active) onEnded();
      }}
      style={{
        width: "100%",
        height: "100%",
        // `contain` so 9:16 video on a 16:9 screen (or vice versa) is
        // pillarboxed/letterboxed instead of cropped.
        objectFit: "contain",
        background: "#000",
        display: "block",
        // Force the video onto its own GPU compositor layer. Without this,
        // many Smart TV browsers (and even desktop Chrome occasionally)
        // render rotated <video> as a black rectangle because the hardware
        // video pipeline can't decode into a transformed surface.
        transform: "translateZ(0)",
        WebkitTransform: "translateZ(0)",
        willChange: "transform",
        backfaceVisibility: "hidden",
        WebkitBackfaceVisibility: "hidden",
      }}
    />
  );
}

/* ───────────────────────── Helpers ───────────────────────── */

type Viewport = { w: number; h: number };

function readViewport(): Viewport {
  if (typeof window === "undefined") return { w: 1920, h: 1080 };
  return { w: window.innerWidth, h: window.innerHeight };
}

/**
 * Returns positioning + transform CSS for the rotated wrapper.
 *
 * Strategy: place the wrapper at one corner of the viewport and rotate
 * around `transform-origin: 0 0`. This avoids the `inset: 0` collision
 * that prevents explicit width/height from taking effect.
 *
 *  ┌─────────────────────────┐         ┌─────────────────────────┐
 *  │  0deg                   │         │  90deg (CW)             │
 *  │  top: 0, left: 0        │         │  top: 0, left: viewport │
 *  │  width: vw, height: vh  │   →     │  width: vh, height: vw  │
 *  │                         │         │  rotate(90deg) origin 0 0│
 *  └─────────────────────────┘         └─────────────────────────┘
 */
function computeRotationWrapper(
  configured: "auto" | "landscape" | "portrait",
  rotationDegrees: number,
  vp: Viewport,
): React.CSSProperties {
  const physicalLandscape = vp.w >= vp.h;

  let baseRotation = 0;
  if (configured === "landscape" && !physicalLandscape) baseRotation = -90;
  else if (configured === "portrait" && physicalLandscape) baseRotation = 90;

  // Normalize to 0..359
  const total = (((baseRotation + (rotationDegrees || 0)) % 360) + 360) % 360;

  if (total === 0) {
    return {
      top: 0,
      left: 0,
      width: "100vw",
      height: "100vh",
    };
  }

  if (total === 180) {
    return {
      top: 0,
      left: 0,
      width: "100vw",
      height: "100vh",
      transformOrigin: "center center",
      transform: "rotate(180deg)",
    };
  }

  if (total === 90) {
    // Rotate 90° clockwise. Place wrapper at top-right corner, then rotate
    // around its top-left so it sweeps down-and-left to fill the viewport.
    return {
      top: 0,
      left: "100vw",
      width: "100vh",
      height: "100vw",
      transformOrigin: "0 0",
      transform: "rotate(90deg)",
    };
  }

  // 270° (or -90°): rotate counter-clockwise. Place at bottom-left corner.
  return {
    top: "100vh",
    left: 0,
    width: "100vh",
    height: "100vw",
    transformOrigin: "0 0",
    transform: "rotate(-90deg)",
  };
}
