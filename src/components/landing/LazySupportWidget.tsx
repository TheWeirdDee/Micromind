'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';

const SupportWidget = dynamic(
  () => import('@/components/landing/SupportWidget').then((module) => module.SupportWidget),
  { ssr: false }
);

export function LazySupportWidget() {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const timer = window.setTimeout(() => setReady(true), 1500);
    return () => window.clearTimeout(timer);
  }, []);
  return ready ? <SupportWidget /> : null;
}