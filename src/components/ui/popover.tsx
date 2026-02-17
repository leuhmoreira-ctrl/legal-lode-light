import * as React from "react";
import * as PopoverPrimitive from "@radix-ui/react-popover";

import { cn } from "@/lib/utils";
import { composeRefs, useOriginCapture, useOriginMotionStyle } from "@/lib/originMotion";

const Popover = PopoverPrimitive.Root;

const PopoverTrigger = React.forwardRef<
  React.ElementRef<typeof PopoverPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Trigger>
>(({ onPointerDown, onClick, ...props }, ref) => {
  const { captureOrigin } = useOriginCapture();

  return (
    <PopoverPrimitive.Trigger
      ref={ref}
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
PopoverTrigger.displayName = PopoverPrimitive.Trigger.displayName;

const PopoverContent = React.forwardRef<
  React.ElementRef<typeof PopoverPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Content>
>(({ className, align = "center", sideOffset = 4, style, ...props }, ref) => {
  const localRef = React.useRef<React.ElementRef<typeof PopoverPrimitive.Content>>(null);
  const motionStyle = useOriginMotionStyle(localRef as React.RefObject<HTMLElement>);

  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Content
        ref={composeRefs(ref, localRef)}
        align={align}
        sideOffset={sideOffset}
        style={{ ...style, ...motionStyle }}
        className={cn(
          "apple-origin-float-motion z-50 w-72 rounded-md border bg-popover p-4 text-popover-foreground shadow-md outline-none",
          className,
        )}
        {...props}
      />
    </PopoverPrimitive.Portal>
  );
});
PopoverContent.displayName = PopoverPrimitive.Content.displayName;

export { Popover, PopoverTrigger, PopoverContent };
