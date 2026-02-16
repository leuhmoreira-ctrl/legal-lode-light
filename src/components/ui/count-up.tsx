import { useEffect, useState } from 'react';

interface CountUpProps {
  end: number;
  duration?: number;
  start?: number;
  className?: string;
}

export function CountUp({ end, duration = 800, start = 0, className }: CountUpProps) {
  const [count, setCount] = useState(start);

  useEffect(() => {
    let startTime: number | null = null;
    let animationFrameId: number;

    const step = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);

      // Apple-like easeOut (approximate cubic-bezier(0.16, 1, 0.3, 1))
      // Using 1 - (1 - x)^4 is a good approximation for a smooth "ease out"
      const easeOut = 1 - Math.pow(1 - progress, 4);

      setCount(Math.floor(start + (end - start) * easeOut));

      if (progress < 1) {
        animationFrameId = window.requestAnimationFrame(step);
      } else {
          setCount(end);
      }
    };

    animationFrameId = window.requestAnimationFrame(step);

    return () => {
      if (animationFrameId) window.cancelAnimationFrame(animationFrameId);
    };
  }, [end, duration, start]);

  return <span className={className}>{count}</span>;
}
