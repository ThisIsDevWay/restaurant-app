"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import { Instagram, LayoutGrid, Search, ChevronDown, Info, ArrowLeft, X } from "lucide-react";
import { HeaderCartButton } from "@/app/(public)/HeaderCartButton";
import { getCategoryIcon } from "@/lib/categoryIcons";
import { useMenuMode } from "./MenuModeContext";
import { resolveOpenState, formatBusinessHours, type BusinessHours, type StatusOverride } from "@/lib/utils/date";
import { PinIcon, ClockIcon } from "./_parts/HeaderIcons";
import { ThemeSwitch } from "./_parts/ThemeSwitch";
import { MenuHeaderStyles } from "./_parts/MenuHeaderStyles";
import { cn } from "@/lib/utils";
import { SafeImage } from "@/components/shared/SafeImage";

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
    /** From settings.business_hours — drives the open/closed badge */
    businessHours?: BusinessHours | null;
    /** From settings.status_override — manual open/closed override */
    statusOverride?: StatusOverride;
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
    searchQuery: string;
    onSearchChange: (query: string) => void;
    /** Theme toggle — injected from MenuClient */
    theme?: "light" | "dark";
    onToggleTheme?: () => void;
}



// ─── Component ────────────────────────────────────────────────────────────────

export function MenuHeader({
    coverImageUrl,
    logoUrl,
    restaurantName,
    branchName,
    scheduleText: scheduleTextProp,
    businessHours = null,
    statusOverride = "auto",
    categories,
    activeCategoryId,
    onCategoryChange,
    instagramUrl,
    showRate,
    rateData,
    searchQuery,
    onSearchChange,
    theme = "light",
    onToggleTheme,
}: MenuHeaderProps) {
    const { isReadOnly } = useMenuMode();
    const scrollRef = useRef<HTMLDivElement>(null);
    const [showFade, setShowFade] = useState(true);
    const [greeting, setGreeting] = useState("¡Hola!");
    const [openStatus, setOpenStatus] = useState<boolean | null>(null);
    const [showInfo, setShowInfo] = useState(false);
    const [showSearch, setShowSearch] = useState(false);
    const [isSearchFocused, setIsSearchFocused] = useState(false);
    const isMobileSearchActive = showSearch && (isSearchFocused || searchQuery.length > 0);

    // Texto de horario: usa el override manual o, si está vacío, el autogenerado
    // desde businessHours.
    const scheduleText = scheduleTextProp?.trim() || formatBusinessHours(businessHours) || null;

    // Open/closed status — computed on the client in America/Caracas, refreshed each minute.
    useEffect(() => {
        const compute = () => setOpenStatus(resolveOpenState(businessHours, statusOverride));
        compute();
        const id = setInterval(compute, 60_000);
        return () => clearInterval(id);
    }, [businessHours, statusOverride]);

    useEffect(() => {
        try {
            const hour = parseInt(
                new Intl.DateTimeFormat("en-US", {
                    timeZone: "America/Caracas",
                    hour: "numeric",
                    hour12: false,
                }).format(new Date()),
                10
            );
            if (hour >= 6 && hour < 12) setGreeting("Buenos días");
            else if (hour >= 12 && hour < 19) setGreeting("Buenas tardes");
            else setGreeting("Buenas noches");
        } catch (e) {
            setGreeting("¡Hola!");
        }
    }, []);

    const onSearchChangeRef = useRef(onSearchChange);
    onSearchChangeRef.current = onSearchChange;

    const pushedSearchRef = useRef(false);

    const handleCloseSearch = useCallback(() => {
        if (pushedSearchRef.current && typeof window !== "undefined") {
            window.history.back();
        } else {
            onSearchChangeRef.current("");
            setShowSearch(false);
            setIsSearchFocused(false);
        }
    }, []);

    const handleToggleSearch = useCallback(() => {
        if (showSearch) {
            handleCloseSearch();
        } else {
            setShowSearch(true);
            setTimeout(() => {
                const input = document.getElementById("menu-search-input");
                if (input) {
                    input.focus();
                    input.scrollIntoView({ behavior: "smooth", block: "center" });
                }
            }, 100);
        }
    }, [showSearch, handleCloseSearch]);

    useEffect(() => {
        if (!showSearch || typeof window === "undefined") return;

        window.history.pushState({ gmSearchActive: true }, "");
        pushedSearchRef.current = true;

        const handlePop = () => {
            pushedSearchRef.current = false;
            onSearchChangeRef.current("");
            setShowSearch(false);
            setIsSearchFocused(false);
        };
        window.addEventListener("popstate", handlePop);

        return () => {
            window.removeEventListener("popstate", handlePop);
            pushedSearchRef.current = false;
        };
    }, [showSearch]);

    // Handle Escape key to close search
    useEffect(() => {
        if (!showSearch) return;
        function handleKey(e: KeyboardEvent) {
            if (e.key === "Escape") handleCloseSearch();
        }
        document.addEventListener("keydown", handleKey);
        return () => document.removeEventListener("keydown", handleKey);
    }, [showSearch, handleCloseSearch]);

    useEffect(() => {
        const handleOpenSearch = () => {
            setShowSearch(true);
            setTimeout(() => {
                const input = document.getElementById("menu-search-input");
                if (input) {
                    input.focus();
                    input.scrollIntoView({ behavior: "smooth", block: "center" });
                }
            }, 100);
        };

        window.addEventListener("menu:openSearch", handleOpenSearch);
        return () => {
            window.removeEventListener("menu:openSearch", handleOpenSearch);
        };
    }, []);

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

        const rafId = requestAnimationFrame(check);
        el.addEventListener("scroll", check, { passive: true });
        const ro = new ResizeObserver(check);
        ro.observe(el);
        return () => {
            cancelAnimationFrame(rafId);
            el.removeEventListener("scroll", check);
            ro.disconnect();
        };
    }, [categories]);

    const hasMetadata = branchName !== null || scheduleText !== null;
    const showInfoCard = hasMetadata || openStatus !== null;
    const isStale =
        rateData && Date.now() - new Date(rateData.fetchedAt).getTime() > 24 * 60 * 60 * 1000;

    const instagramHref = instagramUrl
        ? instagramUrl.startsWith("http")
            ? instagramUrl
            : `https://instagram.com/${instagramUrl.replace(/^@/, "")}`
        : null;

    return (
        <div
            className={cn("w-full bg-bg-card shadow-card", !isMobileSearchActive && "overflow-hidden")}
            style={{ animation: "mh-fade-in 700ms ease-out both" }}
        >
            {/* ── Hero ────────────────────────────────────────────────────────── */}
            {/*
              Mobile:  h-[240px]
              Tablet:  h-[300px]
              Desktop: h-[360px]
              XL:      h-[420px]
            */}
            <div className="hidden md:block relative w-full h-[360px] md:h-[380px] lg:h-[440px] xl:h-[500px] overflow-hidden transition-all duration-300">
                {/* Background with Ken Burns effect */}
                {coverImageUrl ? (
                    <SafeImage
                        src={coverImageUrl}
                        alt="Portada de Restaurante"
                        fill
                        className="object-cover mh-ken-burns"
                        sizes="(max-width: 1200px) 100vw, 1280px"
                        priority
                        fetchPriority="high"
                    />
                ) : (
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

                {/* Cinematic multi-layer overlay */}
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

                {/* Warm film look */}
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
                <div className="absolute top-0 left-0 w-full z-10 flex justify-center px-4 pt-4 pb-2 lg:px-8 lg:pt-5">
                    <div className="w-full max-w-7xl flex items-center justify-between">
                        {/* Left: Instagram & Pedidos */}
                        <div className="flex items-center gap-2 lg:gap-3">
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
                                        className="mh-glass-btn flex h-[36px] w-[36px] lg:h-[40px] lg:w-[40px] shrink-0 items-center justify-center rounded-full text-white/90"
                                        aria-label="Instagram"
                                    >
                                        <Instagram className="h-[15px] w-[15px] lg:h-[17px] lg:w-[17px]" />
                                    </a>
                                );
                            })()}
                            {!isReadOnly && (
                                <Link
                                    href="/mis-pedidos"
                                    prefetch={false}
                                    className="mh-glass-btn flex h-[36px] lg:h-[40px] items-center gap-1.5 rounded-full px-3.5 lg:px-5 text-[12px] lg:text-[13px] font-medium text-white/90 whitespace-nowrap tracking-wide"
                                >
                                    Pedidos
                                </Link>
                            )}
                        </div>

                        {/* Right: Rate, Cart, and Theme Switch */}
                        <div className="flex items-center gap-2 lg:gap-3">
                            {showRate && rateData && (
                                <div className="mh-glass-btn flex h-[36px] lg:h-[40px] items-center gap-1.5 rounded-full px-3 lg:px-4 text-[12px] lg:text-[13px] font-medium text-white/90 whitespace-nowrap shrink-0">
                                    <span
                                        title={isStale ? "Tasa del día anterior" : undefined}
                                        className={`h-[6px] w-[6px] rounded-full shrink-0 ${isStale ? "bg-amber-400" : "bg-emerald-400 mh-pulse"}`}
                                    />
                                    <span className="text-white/55 text-[10px] lg:text-[11px] font-semibold tracking-widest uppercase">BCV</span>
                                    <span className="font-bold text-white tracking-tight">
                                        {rateData.rate.toLocaleString("es-VE", {
                                            minimumFractionDigits: 2,
                                            maximumFractionDigits: 2,
                                        })}
                                    </span>
                                </div>
                            )}
                            {onToggleTheme && (
                                <ThemeSwitch theme={theme} onToggle={onToggleTheme} variant="glass" />
                            )}
                            {!isReadOnly && (
                                <HeaderCartButton
                                    className="mh-glass-btn flex h-[36px] w-[36px] lg:h-[40px] lg:w-[40px] shrink-0 items-center justify-center rounded-full !p-0"
                                    iconClassName="text-white/90 h-[16px] w-[16px] lg:h-[18px] lg:w-[18px]"
                                />
                            )}
                        </div>
                    </div>
                </div>

                {/* ── Shimmer line — luxury accent ─────────────────────────────── */}
                <div
                    className="pointer-events-none absolute inset-x-0 mh-shimmer-line"
                    style={{ bottom: 56, height: 1 }}
                />

                {/* ── Center Content ──────────────────────────────────────────── */}
                <div
                    className="absolute inset-x-0 bottom-0 top-0 flex flex-col items-center justify-center pt-[75px] pb-6 lg:pb-8 shrink-0"
                    style={{
                        animation: "mh-logo-in 700ms 180ms cubic-bezier(0.16,1,0.3,1) both",
                    }}
                >
                    {/* Logo & Restaurant Name stacked beautifully */}
                    <div className="flex flex-col items-center justify-center gap-3 lg:gap-4 transition-all duration-500 shrink-0">
                        {logoUrl && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                                src={logoUrl}
                                alt={restaurantName}
                                className={`h-auto w-auto object-contain shrink-0 ${isReadOnly
                                    ? "max-h-[90px] md:max-h-[110px] lg:max-h-[190px]"
                                    : "max-h-[100px] md:max-h-[140px] lg:max-h-[170px] xl:max-h-[190px]"
                                    }`}
                                style={{
                                    filter:
                                        "drop-shadow(0 2px 18px rgba(0,0,0,0.55)) drop-shadow(0 0 6px rgba(0,0,0,0.35))",
                                }}
                            />
                        )}
                        <h1
                            className="font-display text-[26px] md:text-[34px] lg:text-[42px] font-extrabold leading-tight tracking-tight text-white text-center shrink-0"
                            style={{
                                textShadow: "0 2px 24px rgba(0,0,0,0.75), 0 0 8px rgba(0,0,0,0.55)",
                            }}
                        >
                            {restaurantName}
                        </h1>
                    </div>

                    {/* Metadata row */}
                    {(hasMetadata || openStatus !== null) && (
                        <div
                            className="mh-meta-chip mt-4 lg:mt-5 hidden md:flex items-center justify-center flex-wrap shrink-0"
                            style={{
                                gap: 12,
                                padding: "8px 20px",
                                borderRadius: 24,
                                color: "rgba(255,255,255,0.92)",
                                fontSize: "clamp(10px, 2.8vw, 13px)",
                                fontWeight: 600,
                                letterSpacing: "0.03em",
                            }}
                        >
                            {branchName && (
                                <span className="flex items-center gap-1.5">
                                    <PinIcon />
                                    {branchName}
                                </span>
                            )}

                            {branchName && (scheduleText || openStatus !== null) && (
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

                            {scheduleText && openStatus !== null && (
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

                            {openStatus !== null && (
                                <span className="flex items-center gap-1.5 font-semibold">
                                    <span className={`h-1.5 w-1.5 rounded-full ${openStatus ? "bg-emerald-400 mh-pulse" : "bg-rose-500"}`} />
                                    {openStatus ? "Abierto" : "Cerrado"}
                                </span>
                            )}
                        </div>
                    )}

                    {/* Centered Search Bar for Desktop */}
                    <div className="mt-5 lg:mt-6 w-full max-w-lg hidden md:block px-4 shrink-0">
                        <div className="relative w-full">
                            <input
                                id="menu-search-input-desktop"
                                type="text"
                                value={searchQuery}
                                onChange={(e) => onSearchChange(e.target.value)}
                                placeholder="Buscar un plato, ej. asado negro"
                                className="w-full font-sans bg-black/45 backdrop-blur-lg border border-white/15 hover:border-white/25 focus:border-white/35 rounded-2xl py-3 px-5 pl-12 text-[14px] text-white placeholder:text-white/50 outline-none focus:ring-1 focus:ring-white/15 transition-all shadow-[0_12px_40px_rgba(0,0,0,0.25)]"
                            />
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/50 pointer-events-none">
                                <svg
                                    width="16"
                                    height="16"
                                    viewBox="0 0 16 16"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2.5"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                >
                                    <circle cx="7" cy="7" r="5" />
                                    <line x1="14" y1="14" x2="10.5" y2="10.5" />
                                </svg>
                            </span>
                        </div>
                    </div>

                    {/* ── Desktop category count — editorial detail ─────────────── */}
                    {categories.length > 0 && (
                        <p className="hidden lg:block mt-4 text-white/50 text-[12px] font-semibold tracking-[0.18em] uppercase shrink-0">
                            {categories.length} categorías
                        </p>
                    )}
                </div>
            </div>

            {/* ── Mobile App Header (md:hidden) — compact or hero depending on isReadOnly ── */}
            <div className="md:hidden w-full bg-bg-app">
                {isReadOnly ? (
                    <div className={cn("bg-bg-app w-full border-b border-border/10 shadow-sm flex flex-col gap-3 p-4 pb-0 relative transition-all duration-300", isMobileSearchActive && "gap-0 p-3 pb-3 sticky top-0 z-30 border-border/40 shadow-md")}>
                        {onToggleTheme && !isMobileSearchActive && (
                            <div className="absolute top-4 right-4 z-20">
                                <ThemeSwitch theme={theme} onToggle={onToggleTheme} variant="solid" />
                            </div>
                        )}
                        {/* Main row: Logo + Name/Status/Triggers */}
                        {!isMobileSearchActive && (
                            <div className="flex items-center gap-3.5">
                                {/* Logo */}
                                {logoUrl ? (
                                    <img
                                        src={logoUrl}
                                        alt={restaurantName}
                                        className="w-[105px] h-[105px] shrink-0 rounded-full object-contain bg-bg-card p-0.5 shadow-sm border border-border/10"
                                    />
                                ) : (
                                    <div className="w-[105px] h-[105px] rounded-full bg-gradient-to-br from-[#C42B2B] to-[#7E0A0C] flex items-center justify-center font-display italic font-bold text-[36px] text-white shadow-sm shrink-0 border border-border/10">
                                        {restaurantName[0] || "G"}
                                    </div>
                                )}

                                {/* Column: Name + Status + Buttons */}
                                <div className="flex-1 min-w-0 flex flex-col gap-1.5 justify-center">
                                    <h1 className="font-display text-[19px] font-extrabold leading-tight text-text-main tracking-tight break-words pr-20">
                                        {restaurantName}
                                    </h1>
                                    <div className="flex flex-wrap items-center gap-1.5 pr-20">
                                        {openStatus !== null && (
                                            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${openStatus
                                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200/50 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-800/30"
                                                : "bg-rose-50 text-rose-700 border border-rose-200/50 dark:bg-rose-950/20 dark:text-rose-400 dark:border-rose-800/30"
                                                }`}>
                                                <span className={`w-1.5 h-1.5 rounded-full ${openStatus ? "bg-emerald-500 animate-pulse" : "bg-rose-500"}`} />
                                                {openStatus ? "Abierto" : "Cerrado"}
                                            </span>
                                        )}

                                        {showRate && rateData && (
                                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-bg-card border border-border/50 text-[10px] font-bold text-text-main shadow-sm">
                                                <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${isStale ? "bg-amber-400" : "bg-emerald-500 animate-pulse"}`} />
                                                <span className="text-text-main/50 text-[8px] font-bold uppercase tracking-wider mr-0.5">BCV</span>
                                                <span className="font-extrabold font-mono text-[9.5px]">
                                                    Bs. {rateData.rate.toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                </span>
                                            </span>
                                        )}
                                    </div>

                                    {/* Interactive triggers (Info & Search) to save huge vertical space */}
                                    <div className="flex flex-wrap items-center gap-2 mt-1">
                                        <button
                                            onClick={() => setShowInfo(!showInfo)}
                                            className={`flex items-center gap-1.5 px-3 py-1 rounded-full border text-[11px] font-bold shadow-sm active:scale-95 transition-all ${showInfo
                                                ? "bg-text-main text-bg-card border-text-main"
                                                : "bg-surface-section border-border/60 text-text-main"
                                                }`}
                                        >
                                            <Info className="h-3.5 w-3.5 shrink-0" />
                                            <span>{showInfo ? "Info" : "Información"}</span>
                                            <ChevronDown className={`h-3 w-3 transition-transform duration-200 ${showInfo ? "rotate-180" : ""}`} />
                                        </button>

                                        <button
                                            onClick={handleToggleSearch}
                                            className={`flex items-center gap-1.5 px-3 py-1 rounded-full border text-[11px] font-bold shadow-sm active:scale-95 transition-all ${showSearch
                                                ? "bg-text-main text-bg-card border-text-main"
                                                : "bg-surface-section border-border/60 text-text-main"
                                                }`}
                                        >
                                            <Search className="h-3.5 w-3.5 shrink-0" />
                                            <span>Buscar</span>
                                            {searchQuery && (
                                                <span className="ml-1 px-1.5 py-0.2 bg-primary text-white text-[9px] rounded-full font-black">
                                                    !
                                                </span>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Collapsible Information section */}
                        {showInfo && !isMobileSearchActive && (
                            <div className="flex flex-col gap-2.5 mt-1 animate-mh-fade-in">
                                {(branchName || scheduleText || instagramHref) && (
                                    <div className="bg-surface-section/40 border border-border/20 rounded-2xl p-4 flex flex-col gap-3.5 shadow-sm">
                                        {instagramHref && (
                                            <>
                                                <div className="flex items-center justify-between text-[14.5px] text-text-main">
                                                    <span className="font-bold text-text-main/90">Síguenos en Instagram</span>
                                                    <a
                                                        href={instagramHref}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="inline-flex h-8 px-3.5 gap-1.5 items-center justify-center rounded-full bg-text-main/5 border border-border/80 text-text-main text-[13px] font-extrabold transition-all active:scale-95 hover:bg-text-main/10"
                                                    >
                                                        <Instagram className="h-4 w-4" />
                                                        <span>
                                                            {(() => {
                                                                const cleanHandle = instagramUrl
                                                                    ? instagramUrl.replace(/^(https?:\/\/)?(www\.)?instagram\.com\//, "").replace(/\/$/, "")
                                                                    : "Instagram";
                                                                return cleanHandle.startsWith("@") ? cleanHandle : `@${cleanHandle}`;
                                                            })()}
                                                        </span>
                                                    </a>
                                                </div>
                                                {(branchName || scheduleText) && (
                                                    <div className="h-px bg-border/40" />
                                                )}
                                            </>
                                        )}
                                        {branchName && (
                                            <div className="flex items-start gap-2.5 text-[14.5px] text-text-main leading-relaxed">
                                                <span className="text-[#C42B2B] mt-0.5 shrink-0">
                                                    <PinIcon />
                                                </span>
                                                <span className="font-semibold">{branchName}</span>
                                            </div>
                                        )}
                                        {branchName && scheduleText && (
                                            <div className="h-px bg-border/40" />
                                        )}
                                        {scheduleText && (
                                            <div className="flex items-start gap-2.5 text-[14.5px] text-text-main font-mono leading-relaxed">
                                                <span className="text-[#C42B2B] mt-0.5 shrink-0">
                                                    <ClockIcon />
                                                </span>
                                                <span className="font-medium">{scheduleText}</span>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Collapsible Search bar */}
                        {showSearch && (
                            <div className={cn("px-0 pb-3 pt-1 animate-mh-fade-in", isMobileSearchActive && "pb-0 pt-0 flex items-center gap-3")}>
                                {isMobileSearchActive && (
                                    <button
                                        type="button"
                                        onClick={handleCloseSearch}
                                        className="h-9 w-9 shrink-0 flex items-center justify-center rounded-full bg-surface-section text-text-main active:scale-95 transition-all border border-border/30 shadow-sm"
                                        aria-label="Volver"
                                    >
                                        <ArrowLeft className="h-5 w-5" />
                                    </button>
                                )}
                                <div className="relative flex-1">
                                    <input
                                        id="menu-search-input"
                                        type="text"
                                        value={searchQuery}
                                        onChange={(e) => onSearchChange(e.target.value)}
                                        onFocus={() => setIsSearchFocused(true)}
                                        onBlur={() => {
                                            setTimeout(() => {
                                                setIsSearchFocused(false);
                                            }, 200);
                                        }}
                                        placeholder="Buscar un plato…"
                                        className="w-full font-sans bg-bg-card border border-input rounded-xl py-2.5 px-4 pl-10 pr-9 text-[13.5px] text-text-main placeholder:text-text-muted outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all shadow-card"
                                    />
                                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none">
                                        <Search className="h-4 w-4" />
                                    </span>
                                    {searchQuery && (
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                onSearchChange("");
                                                const input = document.getElementById("menu-search-input");
                                                if (input) input.focus();
                                            }}
                                            className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7 flex items-center justify-center text-text-muted hover:text-text-main active:scale-90"
                                        >
                                            <X className="h-4 w-4" />
                                        </button>
                                    )}
                                </div>
                            </div>
                        )}
                        <div className="h-1.5" />
                    </div>
                ) : (
                    <div className="w-full bg-bg-app">
                        {/* Hero con imagen de fondo */}
                        {!isMobileSearchActive && (
                            <div className="relative w-full overflow-hidden">
                                {/* Background */}
                                {coverImageUrl ? (
                                    <SafeImage
                                        src={coverImageUrl}
                                        alt="Portada de Restaurante"
                                        fill
                                        className="object-cover mh-ken-burns"
                                        sizes="(max-width: 480px) 360px, (max-width: 768px) 640px, 100vw"
                                        priority
                                        fetchPriority="high"
                                    />
                                ) : (
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

                                {/* Cinematic overlay */}
                                <div
                                    className="pointer-events-none absolute inset-0"
                                    style={{
                                        background: [
                                            "linear-gradient(180deg, rgba(0,0,0,0.45) 0%, rgba(0,0,0,0.15) 35%, rgba(0,0,0,0.55) 78%, rgba(0,0,0,0.92) 100%)",
                                            "radial-gradient(ellipse at 50% 120%, rgba(187,0,5,0.18) 0%, transparent 60%)",
                                        ].join(", "),
                                    }}
                                />
                                {/* Warm film */}
                                <div
                                    className="pointer-events-none absolute inset-0"
                                    style={{
                                        background:
                                            "linear-gradient(135deg, rgba(255,200,100,0.04) 0%, transparent 50%, rgba(100,10,30,0.10) 100%)",
                                        mixBlendMode: "overlay",
                                    }}
                                />

                                {/* Content over image */}
                                <div className={`relative z-10 px-4 pt-4 ${showInfoCard && showInfo ? "pb-16" : "pb-5"}`}>
                                    {/* Top row: Instagram (izq) · BCV + carrito (der) */}
                                    <div className="flex items-center justify-between gap-2">
                                        <div className="flex shrink-0 items-center gap-2">
                                            {instagramHref && (
                                                <a
                                                    href={instagramHref}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    aria-label="Instagram"
                                                    className="mh-glass-btn flex h-10 w-10 items-center justify-center rounded-full text-white"
                                                >
                                                    <Instagram className="h-[18px] w-[18px]" />
                                                </a>
                                            )}
                                        </div>

                                        {/* Right side: BCV + ThemeSwitch + Cart */}
                                        <div className="flex shrink-0 items-center gap-2">
                                            {showRate && rateData && (
                                                <div className="mh-glass-btn flex shrink-0 items-center gap-1.5 rounded-pill px-3 py-[9px]">
                                                    <span
                                                        title={isStale ? "Tasa del día anterior" : undefined}
                                                        className={`h-1.5 w-1.5 shrink-0 rounded-full ${isStale ? "bg-amber-400" : "bg-emerald-400 mh-pulse"}`}
                                                    />
                                                    <span className="text-[9px] font-bold uppercase tracking-widest text-white/55">BCV</span>
                                                    <span className="text-[12px] font-bold tracking-tight text-white">
                                                        {rateData.rate.toLocaleString("es-VE", {
                                                            minimumFractionDigits: 2,
                                                            maximumFractionDigits: 2,
                                                        })}
                                                    </span>
                                                </div>
                                            )}
                                            {onToggleTheme && (
                                                <ThemeSwitch theme={theme} onToggle={onToggleTheme} variant="glass" />
                                            )}
                                            <HeaderCartButton
                                                className="!p-0 flex h-10 w-10 items-center justify-center rounded-full bg-bg-card shadow-elevated"
                                                iconClassName="text-text-main h-[18px] w-[18px]"
                                            />
                                        </div>
                                    </div>

                                    {/* Brand: logo (izq) + Column (name, greeting, compact toggle buttons) */}
                                    <div className="mt-4 flex items-center gap-3.5">
                                        {logoUrl && (
                                            // eslint-disable-next-line @next/next/no-img-element
                                            <img
                                                src={logoUrl}
                                                alt={restaurantName}
                                                className="h-16 w-16 shrink-0 rounded-full bg-bg-card object-contain p-1 shadow-lg ring-1 ring-white/20"
                                            />
                                        )}
                                        <div className="min-w-0 flex-1 flex flex-col gap-1">
                                            <h1
                                                className="truncate font-display text-[22px] font-extrabold leading-tight tracking-tight text-white"
                                                style={{ textShadow: "0 2px 16px rgba(0,0,0,0.45)" }}
                                            >
                                                {restaurantName}
                                            </h1>
                                            <p className="font-sans text-[13px] font-semibold leading-tight text-white/90">
                                                {greeting}
                                            </p>

                                            {/* Compact toggle buttons inside Hero (under name, centered next to logo) */}
                                            <div className="flex items-center gap-2 mt-1">
                                                <button
                                                    onClick={() => setShowInfo(!showInfo)}
                                                    className={`mh-glass-btn flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold text-white shadow-sm active:scale-95 transition-all ${showInfo ? "!bg-white !text-black border-white" : ""
                                                        }`}
                                                >
                                                    <Info className="h-3.5 w-3.5 shrink-0" />
                                                    <span>{showInfo ? "Info" : "Información"}</span>
                                                    <ChevronDown className={`h-3 w-3 transition-transform duration-200 ${showInfo ? "rotate-180" : ""}`} />
                                                </button>

                                                <button
                                                    onClick={handleToggleSearch}
                                                    className={`mh-glass-btn flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold text-white shadow-sm active:scale-95 transition-all ${showSearch ? "!bg-white !text-black border-white" : ""
                                                        }`}
                                                >
                                                    <Search className="h-3.5 w-3.5 shrink-0" />
                                                    <span>Buscar</span>
                                                    {searchQuery && (
                                                        <span className="ml-1 px-1.5 py-0.2 bg-primary text-white text-[9px] rounded-full font-black">
                                                            !
                                                        </span>
                                                    )}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Tarjeta flotante — ubicación · horario · estado */}
                        {showInfoCard && showInfo && !isMobileSearchActive && (
                            <div className="relative z-20 -mt-10 px-4 animate-mh-fade-in">
                                <div className="flex items-center gap-3 rounded-modal bg-bg-card px-4 py-3 shadow-elevated">
                                    {branchName && (
                                        <div className="flex min-w-0 flex-1 flex-col items-center justify-center gap-1.5 text-center">
                                            <span className="shrink-0 text-primary">
                                                <PinIcon />
                                            </span>
                                            <span className="text-[14.5px] font-bold leading-snug text-text-main text-center">
                                                {branchName}
                                            </span>
                                        </div>
                                    )}

                                    {branchName && (scheduleText || openStatus !== null) && (
                                        <div className="w-px shrink-0 self-stretch bg-border-ghost" />
                                    )}

                                    {(scheduleText || openStatus !== null) && (
                                        <div className="flex min-w-0 flex-1 flex-col items-center justify-center gap-1.5 text-center">
                                            {scheduleText && (() => {
                                                const match = /^([^\d]+)\s+(\d.*)$/.exec(scheduleText.trim());
                                                if (match) {
                                                    const dayPart = match[1].replace(/\s*-\s*De\s*$/i, "").trim();
                                                    const hourPart = match[2];
                                                    return (
                                                        <div className="flex flex-col items-center justify-center gap-0.5">
                                                            <span className="flex items-center gap-1 text-[12px] font-extrabold uppercase tracking-wider text-text-main/80">
                                                                <span className="shrink-0 text-primary">
                                                                    <ClockIcon />
                                                                </span>
                                                                {dayPart}
                                                            </span>
                                                            <span className="text-[14.5px] font-extrabold text-text-main">
                                                                {hourPart}
                                                            </span>
                                                        </div>
                                                    );
                                                }
                                                return (
                                                    <span className="flex items-center justify-center gap-1.5 text-[14.5px] font-bold text-text-main text-center">
                                                        <span className="shrink-0 text-primary">
                                                            <ClockIcon />
                                                        </span>
                                                        {scheduleText}
                                                    </span>
                                                );
                                            })()}
                                            {openStatus !== null && <OpenBadge open={openStatus} />}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Buscador full-width */}
                        {showSearch && (
                            <div className={cn("px-4 pb-1 pt-4 animate-mh-fade-in", isMobileSearchActive && "pb-3 pt-3 flex items-center gap-3 bg-bg-app border-b border-border/20 sticky top-0 z-30 shadow-sm")}>
                                {isMobileSearchActive && (
                                    <button
                                        type="button"
                                        onClick={handleCloseSearch}
                                        className="h-9 w-9 shrink-0 flex items-center justify-center rounded-full bg-surface-section text-text-main active:scale-95 transition-all border border-border/30 shadow-sm"
                                        aria-label="Volver"
                                    >
                                        <ArrowLeft className="h-5 w-5" />
                                    </button>
                                )}
                                <div className="relative flex-1">
                                    <input
                                        id="menu-search-input"
                                        type="text"
                                        value={searchQuery}
                                        onChange={(e) => onSearchChange(e.target.value)}
                                        onFocus={() => setIsSearchFocused(true)}
                                        onBlur={() => {
                                            setTimeout(() => {
                                                setIsSearchFocused(false);
                                            }, 200);
                                        }}
                                        placeholder="Buscar un plato, ej. asado negro"
                                        className="w-full font-sans bg-bg-card border border-input rounded-xl py-3 px-4 pl-10 pr-9 text-[13px] text-text-main placeholder:text-text-main/40 outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all shadow-card"
                                    />
                                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-main/40 pointer-events-none">
                                        <Search className="h-4 w-4" />
                                    </span>
                                    {searchQuery && (
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                onSearchChange("");
                                                const input = document.getElementById("menu-search-input");
                                                if (input) input.focus();
                                            }}
                                            className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7 flex items-center justify-center text-text-muted hover:text-text-main active:scale-90"
                                        >
                                            <X className="h-4 w-4" />
                                        </button>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* ── Category pills ────────────────────────────────────────────── */}
            <div
                className="relative mh-pills-bar"
                style={{
                    animation: "mh-pills-in 500ms 320ms cubic-bezier(0.16,1,0.3,1) both",
                }}
            >
                {/* Scrollable row — centered for desktop */}
                <div className="w-full flex justify-center">
                    <div
                        ref={scrollRef}
                        className="flex w-full max-w-7xl"
                        style={{
                            overflowX: "auto",
                            scrollbarWidth: "none",
                            WebkitOverflowScrolling: "touch",
                            padding: "12px 16px",
                            gap: 12,
                        } as React.CSSProperties}
                    >
                        {/* "Todos" pill */}
                        <PillButton
                            active={activeCategoryId === null}
                            onClick={() => onCategoryChange(null)}
                        >
                            <LayoutGrid className="h-[18px] w-[18px] shrink-0" strokeWidth={2.4} />
                            Todos
                        </PillButton>

                        {categories.map((cat) => {
                            const Icon = getCategoryIcon(cat.name);
                            return (
                                <PillButton
                                    key={cat.id}
                                    active={activeCategoryId === cat.id}
                                    onClick={() => onCategoryChange(cat.id)}
                                >
                                    <Icon className="h-[18px] w-[18px] shrink-0" strokeWidth={2.2} />
                                    {cat.name}
                                </PillButton>
                            );
                        })}
                    </div>
                </div>

                {/* Right-side scroll-fade indicator */}
                {showFade && (
                    <div
                        className="pointer-events-none absolute right-0 top-0 h-full"
                        style={{
                            width: 64,
                            background:
                                "linear-gradient(to right, transparent, var(--bg-card) 85%)",
                        }}
                    />
                )}
            </div>

            {/* ── Scoped styles ────────────────────────────────────────────── */}
            <MenuHeaderStyles />
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
            <span className="flex items-center gap-1.5">{children}</span>
        </button>
    );
}

// ─── Open / Closed Badge ────────────────────────────────────────────────────

function OpenBadge({ open }: { open: boolean }) {
    return open ? (
        <span className="inline-flex w-fit items-center gap-1 rounded-pill bg-success/15 px-2.5 py-0.5 text-[12px] font-extrabold text-success">
            <span className="h-1.5 w-1.5 rounded-full bg-success" />
            Abierto
        </span>
    ) : (
        <span className="inline-flex w-fit items-center gap-1 rounded-pill bg-error/10 px-2.5 py-0.5 text-[12px] font-extrabold text-error">
            <span className="h-1.5 w-1.5 rounded-full bg-error" />
            Cerrado
        </span>
    );
}