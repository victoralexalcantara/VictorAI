"use client"

import * as React from "react"
import * as ScrollAreaPrimitive from "@radix-ui/react-scroll-area"

import { cn } from "@/lib/utils"

export type ScrollAreaRef = React.ElementRef<typeof ScrollAreaPrimitive.Root> & {
  viewport: HTMLDivElement | null;
};

const ScrollArea = React.forwardRef<
  ScrollAreaRef,
  React.ComponentPropsWithoutRef<typeof ScrollAreaPrimitive.Root>
>(({ className, children, ...props }, ref) => {
  const rootRef = React.useRef<React.ElementRef<typeof ScrollAreaPrimitive.Root>>(null);
  const viewportRef = React.useRef<HTMLDivElement>(null);

  React.useImperativeHandle(ref, () => {
    const root = rootRef.current;
    if (!root) {
      return null as any; // Should not happen
    }
    
    if (!Object.prototype.hasOwnProperty.call(root, 'viewport')) {
      Object.defineProperty(root, 'viewport', {
        get: () => viewportRef.current,
      });
    }

    return root as ScrollAreaRef;
  }, []);

  return (
    <ScrollAreaPrimitive.Root
      ref={rootRef}
      className={cn("relative overflow-hidden", className)}
      {...props}
    >
      <ScrollAreaPrimitive.Viewport ref={viewportRef} className="h-full w-full rounded-[inherit]">
        {children}
      </ScrollAreaPrimitive.Viewport>
      <ScrollBar />
      <ScrollAreaPrimitive.Corner />
    </ScrollAreaPrimitive.Root>
  )
});
ScrollArea.displayName = ScrollAreaPrimitive.Root.displayName

const ScrollBar = React.forwardRef<
  React.ElementRef<typeof ScrollAreaPrimitive.ScrollAreaScrollbar>,
  React.ComponentPropsWithoutRef<typeof ScrollAreaPrimitive.ScrollAreaScrollbar>
>(({ className, orientation = "vertical", ...props }, ref) => (
  <ScrollAreaPrimitive.ScrollAreaScrollbar
    ref={ref}
    orientation={orientation}
    className={cn(
      "flex touch-none select-none transition-colors",
      orientation === "vertical" &&
        "h-full w-2.5 border-l border-l-transparent p-[1px]",
      orientation === "horizontal" &&
        "h-2.5 flex-col border-t border-t-transparent p-[1px]",
      className
    )}
    {...props}
  >
    <ScrollAreaPrimitive.ScrollAreaThumb className="relative flex-1 rounded-full bg-border" />
  </ScrollAreaPrimitive.ScrollAreaScrollbar>
))
ScrollBar.displayName = ScrollAreaPrimitive.ScrollAreaScrollbar.displayName

export { ScrollArea, ScrollBar }
