import * as React from "react";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";

import { cn } from "@/lib/utils";
import { composeRefs, useOriginCapture, useOriginMotionStyle } from "@/lib/originMotion";

const TooltipProvider = TooltipPrimitive.Provider;

const Tooltip = TooltipPrimitive.Root;

const TooltipTrigger = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Trigger>
>(({ onPointerDown, onPointerEnter, onFocus, onClick, ...props }, ref) => {
  const { captureOrigin, captureFromElement } = useOriginCapture();

  return (
    <TooltipPrimitive.Trigger
      ref={ref}
      onPointerDown={(e) => {
        captureOrigin(e);
        onPointerDown?.(e);
      }}
      onPointerEnter={(e) => {
        captureFromElement(e.currentTarget);
        onPointerEnter?.(e);
      }}
      onFocus={(e) => {
        captureFromElement(e.currentTarget);
        onFocus?.(e);
      }}
      onClick={(e) => {
        if (e.detail === 0) {
          captureOrigin(e);
        }
        onClick?.(e);
      }}
      {...props}
    />
  );
});
TooltipTrigger.displayName = TooltipPrimitive.Trigger.displayName;

const TooltipContent = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>
>(({ className, sideOffset = 4, style, ...props }, ref) => {
  const localRef = React.useRef<React.ElementRef<typeof TooltipPrimitive.Content>>(null);
  const motionStyle = useOriginMotionStyle(localRef as React.RefObject<HTMLElement>);

  return (
    <TooltipPrimitive.Content
      ref={composeRefs(ref, localRef)}
      sideOffset={sideOffset}
      style={{ ...style, ...motionStyle }}
      className={cn(
        "apple-tooltip-motion z-50 overflow-hidden rounded-md border bg-popover px-3 py-1.5 text-sm text-popover-foreground shadow-md",
        className,
      )}
      {...props}
    />
  );
});
TooltipContent.displayName = TooltipPrimitive.Content.displayName;

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider };
