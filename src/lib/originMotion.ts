import * as React from "react";

import { useAnimationOrigin } from "@/contexts/AnimationOriginContext";

type Point = { x: number; y: number };

type OriginEventLike = {
  clientX?: number;
  clientY?: number;
  currentTarget?: EventTarget | null;
  target?: EventTarget | null;
};

function getElementCenter(target: EventTarget | null): Point | null {
  if (typeof Element === "undefined" || !(target instanceof Element)) return null;
  const rect = target.getBoundingClientRect();
  return {
    x: rect.left + rect.width / 2,
    y: rect.top + rect.height / 2,
  };
}

function getPointFromEvent(event: OriginEventLike): Point | null {
  const x = typeof event.clientX === "number" ? event.clientX : 0;
  const y = typeof event.clientY === "number" ? event.clientY : 0;
  if (x > 0 || y > 0) return { x, y };
  return getElementCenter(event.currentTarget) || getElementCenter(event.target);
}

export function useOriginCapture() {
  const { setOrigin } = useAnimationOrigin();

  const captureOrigin = React.useCallback(
    (event: OriginEventLike) => {
      const point = getPointFromEvent(event);
      if (point) setOrigin(point);
    },
    [setOrigin]
  );

  const captureFromElement = React.useCallback(
    (element: Element | null) => {
      const point = getElementCenter(element);
      if (point) setOrigin(point);
    },
    [setOrigin]
  );

  return { captureOrigin, captureFromElement };
}

type CustomVars = React.CSSProperties & {
  "--origin-dx"?: string;
  "--origin-dy"?: string;
};

export function useOriginMotionStyle(ref: React.RefObject<HTMLElement>): React.CSSProperties {
  const { origin, getLastOrigin } = useAnimationOrigin();
  const originSnapshot = React.useRef<Point | null>(origin || getLastOrigin());
  const [style, setStyle] = React.useState<CustomVars>({
    "--origin-dx": "0px",
    "--origin-dy": "0px",
  });

  React.useLayoutEffect(() => {
    const recalc = () => {
      const element = ref.current;
      if (!originSnapshot.current) {
        originSnapshot.current = origin || getLastOrigin();
      }
      const snapshot = originSnapshot.current;
      if (!element || !snapshot) {
        setStyle({
          "--origin-dx": "0px",
          "--origin-dy": "0px",
        });
        return;
      }

      const rect = element.getBoundingClientRect();
      const targetX = rect.left + rect.width / 2;
      const targetY = rect.top + rect.height / 2;

      setStyle({
        "--origin-dx": `${snapshot.x - targetX}px`,
        "--origin-dy": `${snapshot.y - targetY}px`,
      });
    };

    recalc();
    const raf = window.requestAnimationFrame(recalc);
    window.addEventListener("resize", recalc, { passive: true });
    return () => {
      window.cancelAnimationFrame(raf);
      window.removeEventListener("resize", recalc);
    };
  }, [ref, origin, getLastOrigin]);

  return style;
}

export function composeRefs<T>(...refs: Array<React.Ref<T> | undefined>) {
  return (node: T) => {
    refs.forEach((ref) => {
      if (!ref) return;
      if (typeof ref === "function") {
        ref(node);
        return;
      }
      (ref as React.MutableRefObject<T | null>).current = node;
    });
  };
}
