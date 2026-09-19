"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * "Modo experto": the ERP is built for MYPE owners with no technical background, so every
 * screen shows the simple version by default. Technical detail (model metrics, raw codes,
 * diagnostics) only appears when this per-browser switch is on (Ajustes → Modo experto).
 */
const KEY = "dss-expert-mode";
const EVENT = "dss-expert-mode-change";

function read(): boolean {
  try {
    return window.localStorage.getItem(KEY) === "on";
  } catch {
    return false;
  }
}

export function useExpertMode(): [boolean, (on: boolean) => void] {
  const [expert, setExpert] = useState(false);

  useEffect(() => {
    setExpert(read());
    const sync = () => setExpert(read());
    window.addEventListener(EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const set = useCallback((on: boolean) => {
    try {
      window.localStorage.setItem(KEY, on ? "on" : "off");
    } catch {
      /* private mode: keep it in memory only */
    }
    setExpert(on);
    window.dispatchEvent(new Event(EVENT));
  }, []);

  return [expert, set];
}
