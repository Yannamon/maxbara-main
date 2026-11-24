"use client";

import type { ReactNode } from "react";
import { createContext, useContext, useState } from "react";
import { LazyMotion, MotionConfig, useReducedMotion } from "motion/react";
import * as m from "motion/react-m";
import { usePathname } from "next/navigation";

const loadFeatures = () => import("./motion-features").then(module => module.default);
const HeroActive = createContext(false);

export function SiteMotion({ children }: { children: ReactNode }) {
  return <LazyMotion features={loadFeatures} strict>
    <MotionConfig reducedMotion="user" transition={{ duration: .35, ease: [.22, 1, .36, 1] }}>
      {children}
    </MotionConfig>
  </LazyMotion>;
}

export function PageEntrance({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const reduced = useReducedMotion();
  return <m.div key={pathname} initial={{ y: reduced ? 0 : 10 }} animate={{ y: 0 }}
    transition={{ duration: reduced ? 0 : .45, ease: [.22, 1, .36, 1] }}>
    {children}
  </m.div>;
}

export function HeroBanner({ children }: { children: ReactNode }) {
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  return <m.section className="shell hero" onHoverStart={() => setHovered(true)} onHoverEnd={() => setHovered(false)}
    onFocusCapture={() => setFocused(true)} onBlurCapture={event => {
      if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setFocused(false);
    }}>
    <HeroActive.Provider value={hovered || focused}>{children}</HeroActive.Provider>
  </m.section>;
}

export function HeroBackdrop() {
  const clear = useContext(HeroActive);
  const reduced = useReducedMotion();
  return <div className="hero-backdrop" aria-hidden="true">
      <m.div className="hero-backdrop-color" initial={false}
        animate={{ scaleX: reduced ? 1 : clear ? 0 : 1, opacity: reduced && clear ? 0 : 1 }}
        transition={reduced ? { duration: 0 } : { type: "spring", stiffness: 80, damping: 24, mass: .8 }} />
    </div>;
}

export function ChecklistProgress({ value, max, label }: { value: number; max: number; label: string }) {
  const reduced = useReducedMotion();
  return <div className="animated-progress" role="progressbar" aria-label={label}
    aria-valuemin={0} aria-valuemax={max} aria-valuenow={value}>
    <m.span initial={false} animate={{ scaleX: value / max }}
      transition={{ duration: reduced ? 0 : .5, ease: [.22, 1, .36, 1] }} />
  </div>;
}
