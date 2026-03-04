import { useRef, useEffect, useCallback, type ReactNode } from "react";
import { gsap } from "gsap";
import "./MagicBento.css";

const GLOW_COLOR = "91, 156, 246"; // matches --primary

// ── Particle helpers ────────────────────────────────────────────────────────

function makeParticle(x: number, y: number): HTMLDivElement {
  const el = document.createElement("div");
  el.className = "mb-particle";
  el.style.left = `${x}px`;
  el.style.top = `${y}px`;
  return el;
}

// ── ParticleCard ─────────────────────────────────────────────────────────────

interface ParticleCardProps {
  children: ReactNode;
  className?: string;
  style?: React.CSSProperties;
  particleCount?: number;
  clickEffect?: boolean;
  "data-index"?: number;
}

export function ParticleCard({
  children,
  className = "",
  style,
  particleCount = 10,
  clickEffect = true,
  "data-index": dataIndex,
}: ParticleCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const liveParticles = useRef<HTMLDivElement[]>([]);
  const timeouts = useRef<ReturnType<typeof setTimeout>[]>([]);
  const hovered = useRef(false);
  const pool = useRef<HTMLDivElement[]>([]);
  const poolReady = useRef(false);

  const buildPool = useCallback(() => {
    if (poolReady.current || !cardRef.current) return;
    const { width, height } = cardRef.current.getBoundingClientRect();
    pool.current = Array.from({ length: particleCount }, () =>
      makeParticle(Math.random() * width, Math.random() * height)
    );
    poolReady.current = true;
  }, [particleCount]);

  const clearParticles = useCallback(() => {
    timeouts.current.forEach(clearTimeout);
    timeouts.current = [];
    liveParticles.current.forEach((p) => {
      gsap.to(p, {
        scale: 0,
        opacity: 0,
        duration: 0.25,
        ease: "back.in(1.7)",
        onComplete: () => { p.parentNode?.removeChild(p); },
      });
    });
    liveParticles.current = [];
  }, []);

  const spawnParticles = useCallback(() => {
    if (!cardRef.current || !hovered.current) return;
    buildPool();

    pool.current.forEach((source, i) => {
      const tid = setTimeout(() => {
        if (!hovered.current || !cardRef.current) return;
        const clone = source.cloneNode(true) as HTMLDivElement;
        cardRef.current.appendChild(clone);
        liveParticles.current.push(clone);

        gsap.fromTo(clone, { scale: 0, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.3, ease: "back.out(1.7)" });
        gsap.to(clone, {
          x: (Math.random() - 0.5) * 80,
          y: (Math.random() - 0.5) * 80,
          rotation: Math.random() * 360,
          duration: 2 + Math.random() * 2,
          ease: "none",
          repeat: -1,
          yoyo: true,
        });
        gsap.to(clone, {
          opacity: 0.25,
          duration: 1.5,
          ease: "power2.inOut",
          repeat: -1,
          yoyo: true,
        });
      }, i * 80);
      timeouts.current.push(tid);
    });
  }, [buildPool]);

  useEffect(() => {
    const el = cardRef.current;
    if (!el) return;

    const onEnter = () => { hovered.current = true; spawnParticles(); };
    const onLeave = () => { hovered.current = false; clearParticles(); };

    const onClick = (e: MouseEvent) => {
      if (!clickEffect) return;
      const rect = el.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const r = Math.max(
        Math.hypot(x, y),
        Math.hypot(x - rect.width, y),
        Math.hypot(x, y - rect.height),
        Math.hypot(x - rect.width, y - rect.height)
      );
      const ripple = document.createElement("div");
      ripple.className = "mb-ripple";
      ripple.style.cssText = `width:${r * 2}px;height:${r * 2}px;left:${x - r}px;top:${y - r}px;`;
      el.appendChild(ripple);
      gsap.fromTo(ripple, { scale: 0, opacity: 1 }, {
        scale: 1, opacity: 0, duration: 0.7, ease: "power2.out",
        onComplete: () => ripple.remove(),
      });
    };

    el.addEventListener("mouseenter", onEnter);
    el.addEventListener("mouseleave", onLeave);
    el.addEventListener("click", onClick);
    return () => {
      hovered.current = false;
      el.removeEventListener("mouseenter", onEnter);
      el.removeEventListener("mouseleave", onLeave);
      el.removeEventListener("click", onClick);
      clearParticles();
    };
  }, [spawnParticles, clearParticles, clickEffect]);

  return (
    <div
      ref={cardRef}
      data-index={dataIndex}
      className={`mb-particle-container ${className}`}
      style={{
        "--glow-color": GLOW_COLOR,
        "--glow-x": "50%",
        "--glow-y": "50%",
        "--glow-intensity": "0",
        "--glow-radius": "400px",
        ...style,
      } as React.CSSProperties}
    >
      {children}
    </div>
  );
}

// ── GlobalSpotlight ───────────────────────────────────────────────────────────

interface GlobalSpotlightProps {
  containerRef: React.RefObject<HTMLDivElement | null>;
  spotlightRadius?: number;
}

export function GlobalSpotlight({
  containerRef,
  spotlightRadius = 420,
}: GlobalSpotlightProps) {
  useEffect(() => {
    if (!containerRef.current) return;

    const spotlight = document.createElement("div");
    spotlight.className = "mb-global-spotlight";
    document.body.appendChild(spotlight);

    const proximity = spotlightRadius * 0.5;
    const fadeDistance = spotlightRadius * 0.8;

    const onMove = (e: MouseEvent) => {
      if (!containerRef.current) return;

      const section = containerRef.current;
      const sRect = section.getBoundingClientRect();
      const inside =
        e.clientX >= sRect.left && e.clientX <= sRect.right &&
        e.clientY >= sRect.top && e.clientY <= sRect.bottom;

      const cards = section.querySelectorAll<HTMLElement>(".mb-card");

      if (!inside) {
        gsap.to(spotlight, { opacity: 0, duration: 0.3, ease: "power2.out" });
        cards.forEach((c) => c.style.setProperty("--glow-intensity", "0"));
        return;
      }

      let minDist = Infinity;
      cards.forEach((card) => {
        const r = card.getBoundingClientRect();
        const cx = r.left + r.width / 2;
        const cy = r.top + r.height / 2;
        const dist = Math.max(0, Math.hypot(e.clientX - cx, e.clientY - cy) - Math.max(r.width, r.height) / 2);
        minDist = Math.min(minDist, dist);

        const glow = dist <= proximity ? 1 : dist <= fadeDistance ? (fadeDistance - dist) / (fadeDistance - proximity) : 0;
        const relX = ((e.clientX - r.left) / r.width) * 100;
        const relY = ((e.clientY - r.top) / r.height) * 100;
        card.style.setProperty("--glow-x", `${relX}%`);
        card.style.setProperty("--glow-y", `${relY}%`);
        card.style.setProperty("--glow-intensity", glow.toString());
        card.style.setProperty("--glow-radius", `${spotlightRadius}px`);
      });

      gsap.to(spotlight, { left: e.clientX, top: e.clientY, duration: 0.1, ease: "power2.out" });

      const targetOpacity = minDist <= proximity ? 0.7
        : minDist <= fadeDistance ? ((fadeDistance - minDist) / (fadeDistance - proximity)) * 0.7
        : 0;
      gsap.to(spotlight, { opacity: targetOpacity, duration: targetOpacity > 0 ? 0.15 : 0.4, ease: "power2.out" });
    };

    const onLeave = () => {
      if (!containerRef.current) return;
      containerRef.current.querySelectorAll<HTMLElement>(".mb-card").forEach((c) =>
        c.style.setProperty("--glow-intensity", "0")
      );
      gsap.to(spotlight, { opacity: 0, duration: 0.3, ease: "power2.out" });
    };

    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseleave", onLeave);
    return () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseleave", onLeave);
      spotlight.parentNode?.removeChild(spotlight);
    };
  }, [containerRef, spotlightRadius]);

  return null;
}
