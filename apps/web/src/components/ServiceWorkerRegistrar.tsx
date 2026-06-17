'use client';
import { useEffect } from 'react';

export default function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    // If a controller already exists, a later controllerchange means a NEW service
    // worker activated (i.e. a fresh deploy) — reload once to pick up new assets.
    // On the first-ever install there is no prior controller, so we do NOT reload.
    const hadController = !!navigator.serviceWorker.controller;
    let refreshing = false;
    const onControllerChange = () => {
      if (!hadController || refreshing) return;
      refreshing = true;
      window.location.reload();
    };
    navigator.serviceWorker.addEventListener('controllerchange', onControllerChange);

    let cleanupUpdates = () => {};
    navigator.serviceWorker
      .register('/sw.js')
      .then((reg) => {
        // Proactively look for a new service worker: now, hourly, and whenever the
        // tab regains focus. Ensures deploys are picked up without a manual refresh.
        const checkForUpdate = () => reg.update().catch(() => {});
        checkForUpdate();
        const interval = setInterval(checkForUpdate, 60 * 60 * 1000);
        const onVisible = () => {
          if (document.visibilityState === 'visible') checkForUpdate();
        };
        document.addEventListener('visibilitychange', onVisible);
        cleanupUpdates = () => {
          clearInterval(interval);
          document.removeEventListener('visibilitychange', onVisible);
        };
      })
      .catch(() => {});

    return () => {
      navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange);
      cleanupUpdates();
    };
  }, []);

  return null;
}
