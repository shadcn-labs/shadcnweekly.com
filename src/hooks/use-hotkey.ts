import { useEffect, useRef } from "react";

const EDITABLE_TAGS: Record<string, true> = {
  INPUT: true,
  SELECT: true,
  TEXTAREA: true,
};

export interface UseHotkeyOptions {
  enabled?: boolean;
  skipWhenTyping?: boolean;
}

export const useHotkey = (
  key: string,
  handler: (event: KeyboardEvent) => void,
  { enabled = true, skipWhenTyping = true }: UseHotkeyOptions = {}
) => {
  const handlerRef = useRef(handler);
  useEffect(() => {
    handlerRef.current = handler;
  });

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      const modified = event.metaKey || event.ctrlKey || event.altKey;
      if (
        event.key.toLowerCase() !== key.toLowerCase() ||
        modified ||
        event.repeat
      ) {
        return;
      }

      const active = document.activeElement;
      const typing =
        EDITABLE_TAGS[active?.tagName ?? ""] ||
        (active instanceof HTMLElement && active.isContentEditable);
      if (skipWhenTyping && typing) {
        return;
      }

      handlerRef.current(event);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [key, enabled, skipWhenTyping]);
};
