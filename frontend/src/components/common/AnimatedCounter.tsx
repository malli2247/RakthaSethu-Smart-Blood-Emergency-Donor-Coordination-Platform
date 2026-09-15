import React, { useEffect, useState, useRef } from 'react';

interface AnimatedCounterProps {
  value: number;
  duration?: number;
  prefix?: string;
  suffix?: string;
  className?: string;
}

export const AnimatedCounter: React.FC<AnimatedCounterProps> = ({
  value,
  duration = 1000,
  prefix = '',
  suffix = '',
  className = '',
}) => {
  const [displayValue, setDisplayValue] = useState<number>(0);
  const startTimestampRef = useRef<number | null>(null);
  const startValueRef = useRef<number>(0);
  const targetValueRef = useRef<number>(value);
  const frameRef = useRef<number | null>(null);

  useEffect(() => {
    // Check if user prefers reduced motion
    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReducedMotion || duration <= 0) {
      setDisplayValue(value);
      targetValueRef.current = value;
      startValueRef.current = value;
      return;
    }

    const startVal = displayValue;
    const targetVal = value;
    startValueRef.current = startVal;
    targetValueRef.current = targetVal;
    startTimestampRef.current = null;

    if (startVal === targetVal) {
      setDisplayValue(targetVal);
      return;
    }

    const easeOutCubic = (x: number): number => 1 - Math.pow(1 - x, 3);

    const step = (timestamp: number) => {
      if (!startTimestampRef.current) startTimestampRef.current = timestamp;
      const elapsed = timestamp - startTimestampRef.current;
      const progress = Math.min(elapsed / duration, 1);
      const easedProgress = easeOutCubic(progress);

      const current = Math.round(startVal + (targetVal - startVal) * easedProgress);
      setDisplayValue(current);

      if (progress < 1) {
        frameRef.current = requestAnimationFrame(step);
      } else {
        setDisplayValue(targetVal);
      }
    };

    frameRef.current = requestAnimationFrame(step);

    return () => {
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
      }
    };
  }, [value, duration]);

  return (
    <span className={`tabular-nums font-bold tracking-tight ${className}`}>
      {prefix}
      {displayValue.toLocaleString()}
      {suffix}
    </span>
  );
};
