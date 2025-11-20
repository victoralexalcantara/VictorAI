'use client';

import { useEffect } from 'react';

// This hook uses the modern visualViewport API to correctly handle the viewport height
// on mobile devices when the on-screen keyboard appears. It sets a CSS variable
// (--viewport-height) that can be used throughout the app for stable height calculations.

export const useVisualViewportHeight = () => {
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;

    const setViewportHeight = () => {
      document.documentElement.style.setProperty(
        '--viewport-height',
        `${vv.height}px`
      );
    };

    vv.addEventListener('resize', setViewportHeight);
    setViewportHeight(); // Set initial value

    return () => vv.removeEventListener('resize', setViewportHeight);
  }, []);
};
