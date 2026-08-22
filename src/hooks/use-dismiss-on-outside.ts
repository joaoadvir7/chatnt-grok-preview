import { useEffect } from "react";

/** Fecha menus/popovers ao clicar fora de qualquer elemento [data-menu] ou ao pressionar Esc. */
export function useDismissOnOutside(onClose: () => void, enabled = true) {
  useEffect(() => {
    if (!enabled) return;
    const down = (e: MouseEvent) => {
      const t = e.target as HTMLElement | null;
      if (!t) return;
      if (t.closest("[data-menu]")) return;
      onClose();
    };
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("mousedown", down);
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("mousedown", down);
      document.removeEventListener("keydown", key);
    };
  }, [onClose, enabled]);
}
