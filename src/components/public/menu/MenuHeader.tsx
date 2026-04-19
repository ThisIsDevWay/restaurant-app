"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Instagram } from "lucide-react";
import { HeaderCartButton } from "@/app/(public)/HeaderCartButton";

// ─── Types ───────────────────────────────────────────────────────────────────

interface Category {
    id: string;
    name: string;
    emoji?: string;
}

interface MenuHeaderProps {
    coverImageUrl: string | null;
    logoUrl: string | null;
    restaurantName: string;
    /** From settings.branch_name */
    branchName: string | null;
    /** From settings.schedule_text */
    scheduleText: string | null;
    categories: Category[];
    activeCategoryId: string | null;
    onCategoryChange: (id: string | null) => void;

    /** Global metadata for top bar */
    instagramUrl?: string | null;
    showRate?: boolean;
    rateData?: {
        rate: number;
        fetchedAt: string | Date;
        currency?: string;
    } | null;
}

// ─── SVG Icons ────────────────────────────────────────────────────────────────

function PinIcon() {
    return (
        <svg
            width="11"
            height="13"
            viewBox="0 0 11 13"
            fill="none"
            aria-hidden="true"
            style={{ flexShrink: 0 }}
        >
            <path
                d="M5.5 0C3.015 0 1 2.015 1 4.5c0 3.375 4.5 8.5 4.5 8.5S10 7.875 10 4.5C10 2.015 7.985 0 5.5 0Zm0 6.25A1.75 1.75 0 1 1 5.5 2.75a1.75 1.75 0 0 1 0 3.5Z"
                fill="currentColor"
            />
        </svg>
    );
}

function ClockIcon() {
    return (
        <svg
            width="12"
            height="12"
            viewBox="0 0 12 12"
            fill="none"
            aria-hidden="true"
            style={{ flexShrink: 0 }}
        >
            <circle cx="6" cy="6" r="5.25" stroke="currentColor" strokeWidth="1.5" />
            <path
                d="M6 3v3.25L8 8"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    );
}

// ─── Component ────────────────────────────────────────────────────────────────

export function MenuHeader({
    coverImageUrl,
    logoUrl,
    restaurantName,
    branchName,
    scheduleText,
    categories,
    activeCategoryId,
    onCategoryChange,
    instagramUrl,
    showRate,
    rateData,
}: MenuHeaderProps) {
    const scrollRef = useRef<HTMLDivElement>(null);
    const [showFade, setShowFade] = useState(true);

    // Dynamically control right-fade visibility based on scroll position
    useEffect(() => {
        const el = scrollRef.current;
        if (!el) return;

        const check = () => {
            setShowFade(
                el.scrollWidth > el.clientWidth &&
                el.scrollLeft + el.clientWidth < el.scrollWidth - 4,
            );
        };

        check();
        el.addEventListener("scroll", check, { passive: true });
        window.addEventListener("resize", check);
        return () => {
            el.removeEventListener("scroll", check);
            window.removeEventListener("resize", check);
        };
    }, [categories]);

    const hasMetadata = branchName !== null || scheduleText !== null;
    const isStale =
        rateData && Date.now() - new Date(rateData.fetchedAt).getTime() > 24 * 60 * 60 * 1000;

    return (
        <div
            className="max-w-md mx-auto"
            style={{ animation: "mh-fade-in 700ms ease-out both" }}
        >
            {/* ── Hero ────────────────────────────────────────────────────────── */}
            <div
                className="relative overflow-hidden"
                style={{ height: 240 }}
            >
                {/* Background with Ken Burns effect */}
                {coverImageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                        src={coverImageUrl}
                        alt={restaurantName}
                        className="mh-ken-burns"
                        style={{
                            position: "absolute",
                            inset: "-8%",
                            width: "116%",
                            height: "116%",
                            objectFit: "cover",
                        }}
                    />
                ) : (
                    /* Textured dark fallback */
                    <div
                        style={{
                            position: "absolute",
                            inset: 0,
                            backgroundColor: "#0a0a0a",
                            backgroundImage:
                                "radial-gradient(ellipse at 30% 50%, rgba(187,0,5,0.12) 0%, transparent 60%), radial-gradient(circle, rgba(255,255,255,0.03) 1px, transparent 1px)",
                            backgroundSize: "100% 100%, 20px 20px",
                        }}
                    />
                )}

                {/* Cinematic multi-layer overlay — deeper, richer */}
                <div
                    style={{
                        position: "absolute",
                        inset: 0,
                        background: [
                            "linear-gradient(180deg, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.12) 30%, rgba(0,0,0,0.50) 65%, rgba(0,0,0,0.96) 100%)",
                            "radial-gradient(ellipse at 50% 110%, rgba(187,0,5,0.18) 0%, transparent 60%)",
                        ].join(", "),
                    }}
                />

                {/* Subtle color grading — warm film look */}
                <div
                    className="pointer-events-none absolute inset-0"
                    style={{
                        background:
                            "linear-gradient(135deg, rgba(255,200,100,0.04) 0%, transparent 50%, rgba(100,10,30,0.10) 100%)",
                        mixBlendMode: "overlay",
                    }}
                />

                {/* Top vignette */}
                <div
                    className="pointer-events-none absolute inset-x-0 top-0"
                    style={{
                        height: 80,
                        background: "linear-gradient(180deg, rgba(0,0,0,0.45) 0%, transparent 100%)",
                    }}
                />

                {/* ── Top Bar ──────────────────────────────────────────────────── */}
                <div className="absolute top-0 left-0 w-full z-10 flex items-center justify-between px-4 pt-4 pb-2">
                    {/* Left: Instagram & Pedidos */}
                    <div className="flex items-center gap-2">
                        {instagramUrl && (() => {
                            const url = instagramUrl;
                            const formattedUrl = url.startsWith("http")
                                ? url
                                : `https://instagram.com/${url.replace(/^@/, "")}`;

                            return (
                                <a
                                    href={formattedUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="mh-glass-btn flex h-[36px] w-[36px] shrink-0 items-center justify-center rounded-full text-white/90"
                                    aria-label="Instagram"
                                >
                                    <Instagram className="h-[15px] w-[15px]" />
                                </a>
                            );
                        })()}
                        <Link
                            href="/mis-pedidos"
                            className="mh-glass-btn flex h-[36px] items-center gap-1.5 rounded-full px-3.5 text-[12px] font-medium text-white/90 whitespace-nowrap tracking-wide"
                        >
                            Pedidos
                        </Link>
                    </div>

                    {/* Right: Rate and Cart */}
                    <div className="flex items-center gap-2">
                        {showRate && rateData && (
                            <div className="mh-glass-btn flex h-[36px] items-center gap-1.5 rounded-full px-3 text-[12px] font-medium text-white/90 whitespace-nowrap shrink-0">
                                <span
                                    title={isStale ? "Tasa del día anterior" : undefined}
                                    className={`h-[6px] w-[6px] rounded-full shrink-0 ${isStale ? "bg-amber-400" : "bg-emerald-400 mh-pulse"}`}
                                />
                                <span className="text-white/55 text-[10px] font-semibold tracking-widest uppercase">BCV</span>
                                <span className="font-bold text-white tracking-tight">
                                    {rateData.rate.toLocaleString("es-VE", {
                                        minimumFractionDigits: 2,
                                        maximumFractionDigits: 2,
                                    })}
                                </span>
                            </div>
                        )}
                        <HeaderCartButton
                            className="mh-glass-btn flex h-[36px] w-[36px] shrink-0 items-center justify-center rounded-full !p-0"
                            iconClassName="text-white/90 h-[16px] w-[16px]"
                        />
                    </div>
                </div>

                {/* ── Shimmer line — luxury accent ─────────────────────────────── */}
                <div
                    className="pointer-events-none absolute inset-x-0 mh-shimmer-line"
                    style={{ bottom: 56, height: 1 }}
                />

                {/* ── Center Content ──────────────────────────────────────────── */}
                <div
                    className="absolute inset-x-0 bottom-0 flex flex-col items-center justify-end pb-4"
                    style={{
                        top: 44,
                        animation: "mh-logo-in 700ms 180ms cubic-bezier(0.16,1,0.3,1) both",
                    }}
                >
                    {/* Logo or restaurant name */}
                    {logoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                            src={logoUrl}
                            alt={restaurantName}
                            style={{
                                maxHeight: 90,
                                objectFit: "contain",
                                filter:
                                    "drop-shadow(0 2px 24px rgba(0,0,0,0.65)) drop-shadow(0 0 8px rgba(0,0,0,0.45))",
                            }}
                        />
                    ) : (
                        <span
                            style={{
                                fontFamily: "Georgia, serif",
                                fontStyle: "italic",
                                fontSize: 32,
                                color: "#FFFFFF",
                                textShadow:
                                    "0 2px 24px rgba(0,0,0,0.65), 0 0 8px rgba(0,0,0,0.45), 2px 2px 0 #D91F26",
                                letterSpacing: "0.02em",
                                lineHeight: 1.2,
                            }}
                        >
                            {restaurantName}
                        </span>
                    )}

                    {/* Metadata row */}
                    {hasMetadata && (
                        <div
                            className="mh-meta-chip mt-3 flex items-center justify-center flex-wrap"
                            style={{
                                gap: 10,
                                padding: "6px 16px",
                                borderRadius: 20,
                                color: "rgba(255,255,255,0.88)",
                                fontSize: 11,
                                fontWeight: 500,
                                letterSpacing: "0.02em",
                            }}
                        >
                            {branchName && (
                                <span className="flex items-center gap-1.5">
                                    <PinIcon />
                                    {branchName}
                                </span>
                            )}

                            {branchName && scheduleText && (
                                <span
                                    aria-hidden="true"
                                    style={{
                                        width: 3,
                                        height: 3,
                                        borderRadius: "50%",
                                        background: "rgba(255,255,255,0.35)",
                                        display: "inline-block",
                                        flexShrink: 0,
                                    }}
                                />
                            )}

                            {scheduleText && (
                                <span className="flex items-center gap-1.5">
                                    <ClockIcon />
                                    {scheduleText}
                                </span>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* ── Category pills ────────────────────────────────────────────── */}
            <div
                className="relative mh-pills-bar"
                style={{
                    animation: "mh-pills-in 500ms 320ms cubic-bezier(0.16,1,0.3,1) both",
                }}
            >
                {/* Scrollable row */}
                <div
                    ref={scrollRef}
                    className="flex"
                    style={{
                        overflowX: "auto",
                        scrollbarWidth: "none",
                        WebkitOverflowScrolling: "touch",
                        padding: "12px 16px",
                        gap: 8,
                    } as React.CSSProperties}
                >
                    {/* "Todos" pill */}
                    <PillButton
                        active={activeCategoryId === null}
                        onClick={() => onCategoryChange(null)}
                    >
                        Todos
                    </PillButton>

                    {categories.map((cat) => (
                        <PillButton
                            key={cat.id}
                            active={activeCategoryId === cat.id}
                            onClick={() => onCategoryChange(cat.id)}
                        >
                            {cat.emoji ? `${cat.emoji} ` : ""}
                            {cat.name}
                        </PillButton>
                    ))}
                </div>

                {/* Right-side scroll-fade indicator */}
                {showFade && (
                    <div
                        className="pointer-events-none absolute right-0 top-0 h-full"
                        style={{
                            width: 48,
                            background:
                                "linear-gradient(to right, transparent, #FFFFFF 85%)",
                        }}
                    />
                )}
            </div>

            {/* ── Scoped styles ────────────────────────────────────────────── */}
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
                  0%   { transform: scale(1.0) translate(0, 0); }
                  50%  { transform: scale(1.09) translate(-1.5%, -0.8%); }
                  100% { transform: scale(1.0) translate(0, 0); }
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
                  background: #FFFFFF;
                  border-bottom: 1px solid rgba(0,0,0,0.05);
                  box-shadow: 0 2px 8px rgba(0,0,0,0.04);
                }

                /* Premium pill styles */
                .mh-pill {
                  position: relative;
                  border-radius: 999px;
                  padding: 9px 18px;
                  font-size: 13px;
                  font-weight: 500;
                  white-space: nowrap;
                  flex-shrink: 0;
                  border: 1.5px solid transparent;
                  cursor: pointer;
                  transition: all 0.22s cubic-bezier(0.34, 1.56, 0.64, 1);
                  outline: none;
                  letter-spacing: 0.01em;
                  -webkit-tap-highlight-color: transparent;
                }
                .mh-pill[data-active="false"] {
                  background: rgba(240,237,232,0.75);
                  color: #595550;
                  border-color: rgba(0,0,0,0.05);
                }
                .mh-pill[data-active="false"]:hover {
                  background: rgba(232,228,222,0.90);
                  transform: translateY(-1px);
                  box-shadow: 0 2px 8px rgba(0,0,0,0.08);
                }
                .mh-pill[data-active="false"]:active {
                  background: rgba(224,220,212,0.95);
                  transform: scale(0.95);
                }
                .mh-pill[data-active="true"] {
                  background: linear-gradient(135deg, #E8202A 0%, #c01820 100%);
                  color: #fff;
                  font-weight: 650;
                  border-color: rgba(217,31,38,0.15);
                  box-shadow:
                    0 4px 16px rgba(192,0,8,0.35),
                    0 1px 4px rgba(192,0,8,0.20),
                    inset 0 1px 0 rgba(255,255,255,0.15);
                  transform: translateY(-1px);
                }
                .mh-pill[data-active="true"]:active {
                  transform: scale(0.95) translateY(0);
                  box-shadow: 0 2px 8px rgba(192,0,8,0.28);
                }

                /* Hide webkit scrollbar */
                .mh-pills-scroll::-webkit-scrollbar { display: none; }
            `}</style>
        </div>
    );
}

// ─── Pill Button ──────────────────────────────────────────────────────────────

function PillButton({
    active,
    onClick,
    children,
}: {
    active: boolean;
    onClick: () => void;
    children: React.ReactNode;
}) {
    return (
        <button
            className="mh-pill"
            data-active={active}
            onClick={onClick}
        >
            {children}
        </button>
    );
}
