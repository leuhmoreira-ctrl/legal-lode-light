import React, { createContext, useContext, useState, useCallback } from 'react';

type Origin = { x: number; y: number } | null;

interface AnimationOriginContextType {
  origin: Origin;
  setOrigin: (origin: Origin) => void;
}

const AnimationOriginContext = createContext<AnimationOriginContextType | undefined>(undefined);

export function AnimationOriginProvider({ children }: { children: React.ReactNode }) {
  const [origin, setOriginState] = useState<Origin>(null);

  const setOrigin = useCallback((newOrigin: Origin) => {
    setOriginState(newOrigin);
  }, []);

  return (
    <AnimationOriginContext.Provider value={{ origin, setOrigin }}>
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
