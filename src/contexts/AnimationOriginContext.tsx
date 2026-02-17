import React, { createContext, useCallback, useContext, useState } from "react";

type Origin = { x: number; y: number } | null;

interface AnimationOriginContextType {
  origin: Origin;
  setOrigin: (origin: Origin) => void;
  getLastOrigin: () => Origin;
  getLastOriginAt: () => number;
}

const AnimationOriginContext = createContext<AnimationOriginContextType | undefined>(undefined);

export function AnimationOriginProvider({ children }: { children: React.ReactNode }) {
  const [origin, setOriginState] = useState<Origin>(null);
  const lastOriginRef = React.useRef<Origin>(null);
  const lastOriginAtRef = React.useRef(0);

  const setOrigin = useCallback((newOrigin: Origin) => {
    lastOriginRef.current = newOrigin;
    lastOriginAtRef.current = Date.now();
    setOriginState(newOrigin);
  }, []);

  const getLastOrigin = useCallback(() => lastOriginRef.current, []);
  const getLastOriginAt = useCallback(() => lastOriginAtRef.current, []);

  return (
    <AnimationOriginContext.Provider value={{ origin, setOrigin, getLastOrigin, getLastOriginAt }}>
      {children}
    </AnimationOriginContext.Provider>
  );
}

export function useAnimationOrigin() {
  const context = useContext(AnimationOriginContext);
  if (context === undefined) {
    throw new Error("useAnimationOrigin must be used within an AnimationOriginProvider");
  }
  return context;
}
