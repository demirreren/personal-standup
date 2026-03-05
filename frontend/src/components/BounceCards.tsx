import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import './BounceCards.css';

export interface BounceCardData {
  label: string;
  content: string;
  accent: string;
  icon: string;
}

interface BounceCardsProps {
  className?: string;
  cards?: BounceCardData[];
  containerWidth?: number;
  containerHeight?: number;
  animationDelay?: number;
  animationStagger?: number;
  easeType?: string;
  transformStyles?: string[];
  enableHover?: boolean;
}

export default function BounceCards({
  className = '',
  cards = [],
  containerWidth = 700,
  containerHeight = 360,
  animationDelay = 0.4,
  animationStagger = 0.1,
  easeType = 'elastic.out(1, 0.75)',
  transformStyles = [
    'rotate(7deg) translate(-185px)',
    'rotate(-2deg)',
    'rotate(-7deg) translate(185px)',
  ],
  enableHover = true,
}: BounceCardsProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        '.bounce-card',
        { scale: 0 },
        {
          scale: 1,
          stagger: animationStagger,
          ease: easeType,
          delay: animationDelay,
        }
      );
    }, containerRef);
    return () => ctx.revert();
  }, [animationStagger, easeType, animationDelay]);

  const getNoRotationTransform = (transformStr: string): string => {
    if (/rotate\([\s\S]*?\)/.test(transformStr)) {
      return transformStr.replace(/rotate\([\s\S]*?\)/, 'rotate(0deg)');
    }
    return transformStr === 'none' ? 'rotate(0deg)' : `${transformStr} rotate(0deg)`;
  };

  const getPushedTransform = (baseTransform: string, offsetX: number): string => {
    const translateRegex = /translate\(([-0-9.]+)px\)/;
    const match = baseTransform.match(translateRegex);
    if (match) {
      const newX = parseFloat(match[1]) + offsetX;
      return baseTransform.replace(translateRegex, `translate(${newX}px)`);
    }
    return baseTransform === 'none'
      ? `translate(${offsetX}px)`
      : `${baseTransform} translate(${offsetX}px)`;
  };

  const pushSiblings = (hoveredIdx: number) => {
    if (!enableHover || !containerRef.current) return;
    const q = gsap.utils.selector(containerRef);
    cards.forEach((_, i) => {
      const selector = q(`.bounce-card-${i}`);
      gsap.killTweensOf(selector);
      const base = transformStyles[i] || 'none';
      if (i === hoveredIdx) {
        gsap.to(selector, {
          transform: getNoRotationTransform(base),
          duration: 0.4,
          ease: 'back.out(1.4)',
          overwrite: 'auto',
        });
      } else {
        const offsetX = i < hoveredIdx ? -140 : 140;
        gsap.to(selector, {
          transform: getPushedTransform(base, offsetX),
          duration: 0.4,
          ease: 'back.out(1.4)',
          delay: Math.abs(hoveredIdx - i) * 0.05,
          overwrite: 'auto',
        });
      }
    });
  };

  const resetSiblings = () => {
    if (!enableHover || !containerRef.current) return;
    const q = gsap.utils.selector(containerRef);
    cards.forEach((_, i) => {
      const selector = q(`.bounce-card-${i}`);
      gsap.killTweensOf(selector);
      gsap.to(selector, {
        transform: transformStyles[i] || 'none',
        duration: 0.4,
        ease: 'back.out(1.4)',
        overwrite: 'auto',
      });
    });
  };

  return (
    <div
      className={`bounceCardsContainer ${className}`}
      ref={containerRef}
      style={{ position: 'relative', width: containerWidth, height: containerHeight }}
    >
      {cards.map((card, idx) => (
        <div
          key={idx}
          className={`bounce-card bounce-card-${idx}`}
          style={{
            transform: transformStyles[idx] ?? 'none',
            '--card-accent-left': card.accent,
          } as React.CSSProperties}
          onMouseEnter={() => pushSiblings(idx)}
          onMouseLeave={resetSiblings}
        >
          <div className="bounce-card-header">
            <span className="bounce-card-label">{card.label}</span>
          </div>
          <p className="bounce-card-content">{card.content}</p>
        </div>
      ))}
    </div>
  );
}
