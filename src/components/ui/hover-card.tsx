import * as React from "react";
import * as HoverCardPrimitive from "@radix-ui/react-hover-card";

import { cn } from "@/lib/utils";
import { composeRefs, useOriginCapture, useOriginMotionStyle } from "@/lib/originMotion";

const HoverCard = HoverCardPrimitive.Root;

const HoverCardTrigger = React.forwardRef<
  React.ElementRef<typeof HoverCardPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof HoverCardPrimitive.Trigger>
>(({ onPointerEnter, onFocus, onPointerDown, onClick, ...props }, ref) => {
  const { captureOrigin, captureFromElement } = useOriginCapture();

  return (
    <HoverCardPrimitive.Trigger
      ref={ref}
      onPointerEnter={(e) => {
        captureFromElement(e.currentTarget);
        onPointerEnter?.(e);
      }}
      onFocus={(e) => {
        captureFromElement(e.currentTarget);
        onFocus?.(e);
      }}
      onPointerDown={(e) => {
        captureOrigin(e);
        onPointerDown?.(e);
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
HoverCardTrigger.displayName = HoverCardPrimitive.Trigger.displayName;

const HoverCardContent = React.forwardRef<
  React.ElementRef<typeof HoverCardPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof HoverCardPrimitive.Content>
>(({ className, align = "center", sideOffset = 4, style, ...props }, ref) => {
  const localRef = React.useRef<React.ElementRef<typeof HoverCardPrimitive.Content>>(null);
  const motionStyle = useOriginMotionStyle(localRef as React.RefObject<HTMLElement>);

  return (
    <HoverCardPrimitive.Content
      ref={composeRefs(ref, localRef)}
      align={align}
      sideOffset={sideOffset}
      style={{ ...style, ...motionStyle }}
      className={cn(
        "apple-tooltip-motion z-50 w-64 rounded-md border bg-popover p-4 text-popover-foreground shadow-md outline-none",
        className,
      )}
      {...props}
    />
  );
});
HoverCardContent.displayName = HoverCardPrimitive.Content.displayName;

export { HoverCard, HoverCardTrigger, HoverCardContent };
