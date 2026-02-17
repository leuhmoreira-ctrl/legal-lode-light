import React, { createContext, useContext, useState, useCallback } from 'react';

type Origin = { x: number; y: number } | null;

interface AnimationOriginContextType {
  origin: Origin;
  setOrigin: (origin: Origin) => void;
  getLastOrigin: () => Origin;
}

const AnimationOriginContext = createContext<AnimationOriginContextType | undefined>(undefined);

export function AnimationOriginProvider({ children }: { children: React.ReactNode }) {
  const [origin, setOriginState] = useState<Origin>(null);
  const lastOriginRef = React.useRef<Origin>(null);

  const setOrigin = useCallback((newOrigin: Origin) => {
    lastOriginRef.current = newOrigin;
    setOriginState(newOrigin);
  }, []);

  const getLastOrigin = useCallback(() => lastOriginRef.current, []);

  React.useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      if (event.clientX === 0 && event.clientY === 0) return;
      const point = { x: event.clientX, y: event.clientY };
      lastOriginRef.current = point;
      setOriginState(point);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      const active = document.activeElement;
      if (!(active instanceof Element)) return;
      if (
        active instanceof HTMLInputElement ||
        active instanceof HTMLTextAreaElement ||
        active instanceof HTMLSelectElement ||
        active.isContentEditable
      ) {
        return;
      }
      if (
        !active.matches(
          "button, [role='button'], [role='menuitem'], [role='tab'], [role='combobox'], [aria-haspopup='true'], a[href], summary"
        )
      ) {
        return;
      }
      const rect = active.getBoundingClientRect();
      if (!rect.width && !rect.height) return;
      const point = {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2,
      };
      lastOriginRef.current = point;
      setOriginState(point);
    };

    document.addEventListener("pointerdown", handlePointerDown, { capture: true, passive: true });
    document.addEventListener("keydown", handleKeyDown, true);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown, true);
      document.removeEventListener("keydown", handleKeyDown, true);
    };
  }, []);

  return (
    <AnimationOriginContext.Provider value={{ origin, setOrigin, getLastOrigin }}>
      {children}
    </AnimationOriginContext.Provider>
  );
}

export function useAnimationOrigin() {
  const context = useContext(AnimationOriginContext);
  if (context === undefined) {
    throw new Error('useAnimationOrigin must be used within an AnimationOriginProvider');
  }
  return context;
}
