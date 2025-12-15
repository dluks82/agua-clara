"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

export function ChartFrame({
  height,
  className,
  children,
  placeholder,
}: {
  height: number;
  className?: string;
  children: (size: { width: number; height: number }) => React.ReactNode;
  placeholder?: React.ReactNode;
}) {
  const ref = React.useRef<HTMLDivElement | null>(null);
  const [size, setSize] = React.useState({ width: 0, height });

  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const update = () => {
      const nextWidth = el.getBoundingClientRect().width;
      setSize({ width: Math.max(0, Math.floor(nextWidth)), height });
    };

    update();

    const observer = new ResizeObserver(() => update());
    observer.observe(el);
    return () => observer.disconnect();
  }, [height]);

  return (
    <div ref={ref} className={cn("w-full min-w-0 overflow-hidden", className)} style={{ height }}>
      {size.width > 0 ? children(size) : placeholder ?? null}
    </div>
  );
}
