'use client';
import { useEffect, useState } from 'react';

interface Props {
  target: string | Date;
  className?: string;
}

function pad(n: number) {
  return String(n).padStart(2, '0');
}

export default function CountdownTimer({ target, className = '' }: Props) {
  const end = new Date(target).getTime();

  const calc = () => {
    const diff = end - Date.now();
    if (diff <= 0) return null;
    const d = Math.floor(diff / 86400000);
    const h = Math.floor((diff % 86400000) / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    const s = Math.floor((diff % 60000) / 1000);
    return { d, h, m, s };
  };

  const [time, setTime] = useState(calc);

  useEffect(() => {
    const t = setInterval(() => setTime(calc()), 1000);
    return () => clearInterval(t);
  }, [end]);

  if (!time) return null;

  return (
    <div className={`flex items-center gap-1 ${className}`}>
      {time.d > 0 && (
        <>
          <span className="font-black tabular-nums">{time.d}</span>
          <span className="text-[0.7em] opacity-70 mr-0.5">d</span>
        </>
      )}
      <span className="font-black tabular-nums">{pad(time.h)}</span>
      <span className="opacity-50">:</span>
      <span className="font-black tabular-nums">{pad(time.m)}</span>
      <span className="opacity-50">:</span>
      <span className="font-black tabular-nums">{pad(time.s)}</span>
    </div>
  );
}
