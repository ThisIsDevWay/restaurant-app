"use client";

import { useEffect, useRef, useState, useCallback } from "react";

/**
 * useScrollSpy — tracks which section ID is currently most visible
 * inside a scrollable container.
 *
 * @param sectionIds   Ordered list of section IDs to observe.
 * @param rootRef      Ref to the scrollable container (null = viewport).
 * @param threshold    IntersectionObserver threshold (0–1). Default 0.2.
 * @returns            The currently "active" section id.
 */
export function useScrollSpy(
  sectionIds: string[],
  rootRef: React.RefObject<HTMLElement | null>,
  threshold = 0.25,
): string {
  const [activeId, setActiveId] = useState<string>(sectionIds[0] ?? "");
  const intersectingRef = useRef<Record<string, number>>({});

  const pickMostVisible = useCallback(() => {
    let best = "";
    let bestRatio = -1;
    for (const id of sectionIds) {
      const ratio = intersectingRef.current[id] ?? 0;
      if (ratio > bestRatio) {
        bestRatio = ratio;
        best = id;
      }
    }
    if (best) setActiveId(best);
  }, [sectionIds]);

  useEffect(() => {
    if (sectionIds.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          intersectingRef.current[entry.target.id] = entry.intersectionRatio;
        });
        pickMostVisible();
      },
      {
        root: rootRef.current,
        threshold: [0, 0.1, threshold, 0.5, 0.75, 1.0],
        rootMargin: "0px 0px -20% 0px",
      },
    );

    sectionIds.forEach((id) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sectionIds.join(","), rootRef, threshold, pickMostVisible]);

  return activeId;
}
