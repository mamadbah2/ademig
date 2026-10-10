"use client";

import { useEffect, useRef } from "react";

// Donne le focus à un élément après le rendu qui suit une mise à jour de `dependance`.
export function useFocusDiffere(dependance: unknown): (id: string) => void {
  const cible = useRef<string | null>(null);
  useEffect(() => {
    if (cible.current) {
      document.getElementById(cible.current)?.focus();
      cible.current = null;
    }
  }, [dependance]);
  return (id: string) => {
    cible.current = id;
  };
}
