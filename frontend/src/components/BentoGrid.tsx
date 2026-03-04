import { useRef, useEffect, useCallback } from "react";
import gsap from "gsap";

interface BentoCard {
  label: string;
  title: string;
  description: string;
}

const CARDS: BentoCard[] = [
  {
    label: "01",
    title: "Check in",
    description: "What's the plan today? Flag what might block you. Rate your energy 1 to 5. Takes 30 seconds.",
  },
  {
    label: "02",
    title: "Check out",
    description: "End of day. What did you actually ship? What slipped? The gap between plan and reality is the insight.",
  },
  {
    label: "03",
    title: "See the pattern",
    description: "Streaks build. Energy trends surface. A weekly summary captures your wins and recurring blockers.",
  },
];

export default function BentoGrid() {
  const gridRef = useRef<HTMLDivElement>(null);
  const spotlightRef = useRef<HTMLDivElement | null>(null);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!gridRef.current) return;

    const cards = gridRef.current.querySelectorAll<HTMLElement>(".bento-card");

    cards.forEach((card) => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const dist = Math.hypot(e.clientX - centerX, e.clientY - centerY);
      const maxDist = 300;
      const glow = Math.max(0, 1 - dist / maxDist);

      card.style.setProperty("--glow-x", `${(x / rect.width) * 100}%`);
      card.style.setProperty("--glow-y", `${(y / rect.height) * 100}%`);
      card.style.setProperty("--glow", glow.toString());
    });

    if (spotlightRef.current) {
      gsap.to(spotlightRef.current, {
        left: e.clientX,
        top: e.clientY,
        duration: 0.15,
        ease: "power2.out",
      });

      const gridRect = gridRef.current.getBoundingClientRect();
      const inside =
        e.clientX >= gridRect.left &&
        e.clientX <= gridRect.right &&
        e.clientY >= gridRect.top &&
        e.clientY <= gridRect.bottom;

      gsap.to(spotlightRef.current, {
        opacity: inside ? 0.6 : 0,
        duration: inside ? 0.2 : 0.4,
      });
    }
  }, []);

  useEffect(() => {
    const spot = document.createElement("div");
    spot.className = "bento-spotlight";
    document.body.appendChild(spot);
    spotlightRef.current = spot;

    document.addEventListener("mousemove", handleMouseMove);
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      spot.parentNode?.removeChild(spot);
    };
  }, [handleMouseMove]);

  return (
    <div className="bento-grid" ref={gridRef}>
      {CARDS.map((card, i) => (
        <div className="bento-card" key={i}>
          <div className="bento-label">{card.label}</div>
          <h3 className="bento-title">{card.title}</h3>
          <p className="bento-desc">{card.description}</p>
        </div>
      ))}
    </div>
  );
}
