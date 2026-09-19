"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { useExperience } from "@/components/experience/ExperienceProvider";

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Adds a subtle lift + border highlight on hover. */
  interactive?: boolean;
  /** Premium only: on hover, a brand-colored particle travels around the border. */
  particle?: boolean;
}

/** A card is "tinted" when the caller sets its own fill; those keep it in every layer. */
function isTinted(className?: string) {
  return (className ?? "").split(/\s+/).some((t) => {
    const base = t.replace(/^!/, "");
    return base.startsWith("bg-") && base !== "bg-surface";
  });
}

export function Card({ className, children, interactive, particle, ...props }: CardProps) {
  const { effects } = useExperience();
  const showParticle = !!particle && effects;
  const ref = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [hover, setHover] = useState(false);

  useEffect(() => {
    if (!showParticle || !ref.current) return;
    const el = ref.current;
    const update = () => setSize({ w: el.offsetWidth, h: el.offsetHeight });
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, [showParticle]);

  const perimeter = 2 * (size.w - 3 + (size.h - 3));
  const segment = perimeter / 2;
  const head = Math.min(40, segment * 0.32);

  return (
    <div
      ref={ref}
      data-card={isTinted(className) ? "tinted" : "plain"}
      data-spotlight={effects ? "" : undefined}
      onMouseEnter={showParticle ? () => setHover(true) : undefined}
      onMouseLeave={showParticle ? () => setHover(false) : undefined}
      className={cn(
        "relative bg-surface rounded-3xl border border-border p-6 shadow-soft transition-[box-shadow,transform,border-color,background-color] duration-300",
        interactive && "hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-soft-lg",
        showParticle && "overflow-hidden",
        className,
      )}
      {...props}
    >
      {children}
      {showParticle && hover && size.w > 0 && (
        <svg className="pointer-events-none absolute inset-0" width={size.w} height={size.h} aria-hidden="true">
          <rect
            x="1.5"
            y="1.5"
            width={size.w - 3}
            height={size.h - 3}
            rx="19"
            ry="19"
            fill="none"
            strokeWidth="2"
            strokeLinecap="round"
            strokeDasharray={`${head} ${segment - head}`}
            style={
              {
                stroke: "rgb(var(--c-primary))",
                filter: "drop-shadow(0 0 6px rgb(var(--c-primary)))",
                "--travel": `${segment}px`,
                animation: "border-travel 1.6s linear infinite",
              } as React.CSSProperties
            }
          />
        </svg>
      )}
    </div>
  );
}
