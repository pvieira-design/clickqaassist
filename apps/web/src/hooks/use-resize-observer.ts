"use client";

import type { RefObject } from "react";
import { useEffect } from "react";

interface UseResizeObserverOptions {
    ref: RefObject<Element | null>;
    onResize: () => void;
    box?: ResizeObserverBoxOptions;
}

export function useResizeObserver({ ref, onResize, box = "border-box" }: UseResizeObserverOptions): void {
    useEffect(() => {
        const element = ref.current;
        if (!element) return;

        const observer = new ResizeObserver(() => {
            onResize();
        });

        observer.observe(element, { box });

        return () => observer.disconnect();
    }, [ref, onResize, box]);
}
