"use client";

import { useEffect, useState } from "react";

const breakpoints: Record<string, string> = {
    sm: "(min-width: 640px)",
    md: "(min-width: 768px)",
    lg: "(min-width: 1024px)",
    xl: "(min-width: 1280px)",
    "2xl": "(min-width: 1536px)",
};

export function useBreakpoint(breakpoint: keyof typeof breakpoints): boolean {
    const [matches, setMatches] = useState(false);

    useEffect(() => {
        const query = breakpoints[breakpoint];
        if (!query) return;

        const mql = window.matchMedia(query);
        setMatches(mql.matches);

        const handler = (e: MediaQueryListEvent) => setMatches(e.matches);
        mql.addEventListener("change", handler);
        return () => mql.removeEventListener("change", handler);
    }, [breakpoint]);

    return matches;
}
