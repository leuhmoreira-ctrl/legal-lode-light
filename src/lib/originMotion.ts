import * as React from "react";

type OriginEventLike = {
  clientX?: number;
  clientY?: number;
  currentTarget?: EventTarget | null;
  target?: EventTarget | null;
};

export function useOriginCapture() {
  const captureOrigin = React.useCallback((_event: OriginEventLike) => {
    // Motion disabled globally.
  }, []);

  const captureFromElement = React.useCallback((_element: Element | null) => {
    // Motion disabled globally.
  }, []);

  return { captureOrigin, captureFromElement };
}

export function useOriginMotionStyle(_ref: React.RefObject<HTMLElement>): React.CSSProperties {
  return React.useMemo(() => ({}), []);
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
