"use client";
import { useState, useEffect } from "react";

export function useIsMobile() {
  const [m, setM] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    setM(mq.matches);
    const h = (e: MediaQueryListEvent) => setM(e.matches);
    mq.addEventListener("change", h);
    return () => mq.removeEventListener("change", h);
  }, []);
  return m;
}

export function useIsTablet() {
  const [t, setT] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px) and (max-width: 1023px)");
    setT(mq.matches);
    const h = (e: MediaQueryListEvent) => setT(e.matches);
    mq.addEventListener("change", h);
    return () => mq.removeEventListener("change", h);
  }, []);
  return t;
}

export function useA2HS() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isReady, setIsReady] = useState(false);
  const [showManual, setShowManual] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsReady(true);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const triggerInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") { setDeferredPrompt(null); setIsReady(false); }
    } else {
      setShowManual(true);
      setIsReady(false);
    }
  };

  return {
    isReady,
    triggerInstall,
    dismissPrompt: () => setIsReady(false),
    showManual,
    closeManual: () => setShowManual(false),
  };
}
