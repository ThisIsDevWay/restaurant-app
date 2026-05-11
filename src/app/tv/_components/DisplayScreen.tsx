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
  // Should the CURRENT item play with sound?
  const currentItem = items[currentIdx];
  const wantsSound =
    audioEnabled &&
    audioUnlocked &&
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
    if (items.length === 0) return;
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
  }, [currentIdx, items]);

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
        {items.length === 0 ? (
          <EmptyState reconnecting={reconnecting} />
        ) : (
          <Carousel
            items={items}
            currentIdx={currentIdx}
            wantsSound={wantsSound}
            volume={volumePercent / 100}
            onAdvance={() =>
              setCurrentIdx((i) => (i + 1) % items.length)
            }
          />
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
  onAdvance,
}: {
  items: ContentItem[];
  currentIdx: number;
  wantsSound: boolean;
  volume: number;
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
                  active={isCurrent}
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

function EmptyState({ reconnecting }: { reconnecting?: boolean }) {
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#000",
        color: "#fff",
        fontFamily: "system-ui, sans-serif",
        textAlign: "center",
        padding: "5vh 5vw",
      }}
    >
      <div>
        <div
          style={{
            fontSize: "clamp(2.5rem, 6vw, 6rem)",
            fontWeight: 800,
            color: "#f59e0b",
            marginBottom: "2vh",
            letterSpacing: "0.04em",
          }}
        >
          Restaurante G y M
        </div>
        <div
          style={{
            fontSize: "clamp(1.5rem, 3vw, 3rem)",
            opacity: 0.85,
            fontWeight: 300,
          }}
        >
          Bienvenidos
        </div>
        {reconnecting && (
          <div
            style={{
              marginTop: "5vh",
              fontSize: "clamp(0.9rem, 1.5vw, 1.2rem)",
              opacity: 0.4,
            }}
          >
            Reconectando…
          </div>
        )}
      </div>
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
