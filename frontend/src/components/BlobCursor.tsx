import { useRef, useEffect, useCallback } from "react";
import gsap from "gsap";

export default function BlobCursor() {
  const dotRef = useRef<HTMLDivElement>(null);
  const pos = useRef({ x: 0, y: 0 });
  const prev = useRef({ x: 0, y: 0 });

  const handleMove = useCallback((e: MouseEvent | TouchEvent) => {
    const x = "clientX" in e ? e.clientX : e.touches[0].clientX;
    const y = "clientY" in e ? e.clientY : e.touches[0].clientY;

    prev.current = { ...pos.current };
    pos.current = { x, y };

    if (!dotRef.current) return;

    const dx = x - prev.current.x;
    const dy = y - prev.current.y;
    const speed = Math.min(Math.sqrt(dx * dx + dy * dy), 40);
    const angle = Math.atan2(dy, dx) * (180 / Math.PI);

    const stretch = 1 + speed * 0.012;
    const squash = 1 / stretch;

    gsap.to(dotRef.current, {
      x,
      y,
      scaleX: stretch,
      scaleY: squash,
      rotation: angle,
      duration: 0.08,
      ease: "power2.out",
    });

    gsap.to(dotRef.current, {
      scaleX: 1,
      scaleY: 1,
      rotation: 0,
      duration: 0.4,
      ease: "elastic.out(1, 0.4)",
      delay: 0.06,
    });
  }, []);

  useEffect(() => {
    window.addEventListener("mousemove", handleMove);
    window.addEventListener("touchmove", handleMove);
    return () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("touchmove", handleMove);
    };
  }, [handleMove]);

  return (
    <div className="blob-cursor-container">
      <div ref={dotRef} className="blob-dot blob-lead" />
    </div>
  );
}
