import { useRef, useEffect, useCallback } from 'react';
import gsap from 'gsap';

export default function BlobCursor() {
  const dotRef = useRef<HTMLDivElement>(null);
  const pos = useRef({ x: 0, y: 0 });
  const prev = useRef({ x: 0, y: 0 });

  const handleMove = useCallback((e: MouseEvent | TouchEvent) => {
    const x = 'clientX' in e ? e.clientX : e.touches[0].clientX;
    const y = 'clientY' in e ? e.clientY : e.touches[0].clientY;

    prev.current = { ...pos.current };
    pos.current = { x, y };

    if (!dotRef.current) return;

    const dx = x - prev.current.x;
    const dy = y - prev.current.y;
    const speed = Math.min(Math.sqrt(dx * dx + dy * dy), 40);
    const angle = Math.atan2(dy, dx) * (180 / Math.PI);
    const stretch = 1 + speed * 0.04;
    const squash = 1 / stretch;

    gsap.to(dotRef.current, {
      x,
      y,
      scaleX: stretch,
      scaleY: squash,
      rotation: angle,
      duration: 0.08,
      ease: 'power3.out',
    });

    gsap.to(dotRef.current, {
      scaleX: 1,
      scaleY: 1,
      rotation: 0,
      duration: 0.5,
      ease: 'elastic.out(1, 0.4)',
      delay: 0.06,
    });
  }, []);

  useEffect(() => {
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('touchmove', handleMove);
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('touchmove', handleMove);
    };
  }, [handleMove]);

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, pointerEvents: 'none' }}>
      <div
        ref={dotRef}
        style={{
          position: 'absolute',
          width: 10,
          height: 10,
          borderRadius: '50%',
          backgroundColor: '#5b9cf6',
          transform: 'translate(-50%, -50%)',
          willChange: 'transform',
          boxShadow: '0 0 8px rgba(91, 156, 246, 0.6)',
        }}
      />
    </div>
  );
}
