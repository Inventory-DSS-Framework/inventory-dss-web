"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Adds a subtle lift + border highlight on hover. */
  interactive?: boolean;
  /** On hover, a theme-colored particle travels around the card's border. */
  particle?: boolean;
}

export function Card({ className, children, interactive, particle, ...props }: CardProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [hover, setHover] = useState(false);

  useEffect(() => {
    if (!particle || !ref.current) return;
    const el = ref.current;
    const update = () => setSize({ w: el.offsetWidth, h: el.offsetHeight });
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, [particle]);

  // Two evenly-spaced "comets" travel the border. The dash pattern length equals one
  // segment (half the perimeter) so the loop is seamless, and a faint static ring fills
  // the gaps so the effect never feels dead. Short, fast period = lively and continuous.
  const perimeter = 2 * (size.w - 3 + (size.h - 3));
  const segment = perimeter / 2;
  const head = Math.min(40, segment * 0.32);

  return (
    <div
      ref={ref}
      onMouseEnter={particle ? () => setHover(true) : undefined}
      onMouseLeave={particle ? () => setHover(false) : undefined}
      className={cn(
        "bg-surface rounded-3xl shadow-soft border border-border p-6 transition-all duration-200",
        interactive && "hover:shadow-soft-lg hover:border-primary/20 hover:-translate-y-0.5",
        particle && "relative overflow-hidden",
        className,
      )}
      {...props}
    >
      {children}
      {particle && hover && size.w > 0 && (
        <svg className="pointer-events-none absolute inset-0" width={size.w} height={size.h} aria-hidden="true">
          {/* Faint constant ring so the border always reads as alive. */}
          <rect
            x="1.5"
            y="1.5"
            width={size.w - 3}
            height={size.h - 3}
            rx="22"
            ry="22"
            fill="none"
            strokeWidth="1.5"
            style={{ stroke: "rgb(var(--c-primary))", opacity: 0.22 }}
          />
          {/* Two bright comets chasing around the perimeter. */}
          <rect
            x="1.5"
            y="1.5"
            width={size.w - 3}
            height={size.h - 3}
            rx="22"
            ry="22"
            fill="none"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeDasharray={`${head} ${segment - head}`}
            style={
              {
                stroke: "rgb(var(--c-primary))",
                filter: "drop-shadow(0 0 7px rgb(var(--c-primary)))",
                "--travel": `${segment}px`,
                animation: "border-travel 1.2s linear infinite",
              } as React.CSSProperties
            }
          />
        </svg>
      )}
    </div>
  );
}
