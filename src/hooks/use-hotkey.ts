import { useEffect, useRef } from "react";

const EDITABLE_TAGS: Record<string, true> = {
  INPUT: true,
  SELECT: true,
  TEXTAREA: true,
};

export interface UseHotkeyOptions {
  enabled?: boolean;
  /** Ignore the key while the user is typing in a field. */
  skipWhenTyping?: boolean;
}

/**
 * Calls `handler` when the single key `key` is pressed without modifiers
 * (so ⌘D / Ctrl+D keep their browser meaning). Register each hotkey in one
 * mounted component only, or the handler runs once per instance.
 */
export const useHotkey = (
  key: string,
  handler: (event: KeyboardEvent) => void,
  { enabled = true, skipWhenTyping = true }: UseHotkeyOptions = {}
) => {
  // Latest handler without re-subscribing on every render.
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
