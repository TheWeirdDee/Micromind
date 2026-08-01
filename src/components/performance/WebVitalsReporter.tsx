'use client';

import { useReportWebVitals } from 'next/web-vitals';

export function WebVitalsReporter() {
  useReportWebVitals((metric) => {
    const body = JSON.stringify({
      id: metric.id,
      name: metric.name,
      value: metric.value,
      rating: metric.rating,
      navigationType: metric.navigationType,
      path: window.location.pathname,
    });
    if (navigator.sendBeacon) navigator.sendBeacon('/api/performance/vitals', body);
    else void fetch('/api/performance/vitals', { method: 'POST', body, keepalive: true });
  });
  return null;
}