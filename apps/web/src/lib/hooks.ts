import * as React from "react";

/**
 * Reusable React custom hooks for Thoth Blueprint.
 * Standardizes UI patterns like local storage sync, debouncing, resize observation, etc.
 */

/** Debounce a value, delaying its propagation. */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = React.useState<T>(value);

  React.useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

/** Synchronize state with window.localStorage. */
export function useLocalStorage<T>(key: string, initialValue: T): [T, (val: T | ((v: T) => T)) => void] {
  const [storedValue, setStoredValue] = React.useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.warn(`Error reading localStorage key "${key}":`, error);
      return initialValue;
    }
  });

  const setValue = React.useCallback(
    (value: T | ((v: T) => T)) => {
      try {
        setStoredValue((prev) => {
          const valueToStore = value instanceof Function ? value(prev) : value;
          window.localStorage.setItem(key, JSON.stringify(valueToStore));
          return valueToStore;
        });
      } catch (error) {
        console.warn(`Error setting localStorage key "${key}":`, error);
      }
    },
    [key],
  );

  return [storedValue, setValue];
}

/** Observe dynamic dimensions of an HTML element. */
export function useResizeObserver(
  element: HTMLElement | null,
  callback: (entry: ResizeObserverEntry) => void,
): void {
  const savedCallback = React.useRef(callback);

  React.useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  React.useEffect(() => {
    if (!element) {return;}
    const observer = new ResizeObserver((entries) => {
      if (entries[0]) {
        savedCallback.current(entries[0]);
      }
    });
    observer.observe(element);
    return () => {
      observer.disconnect();
    };
  }, [element]);
}

/** Trigger callback when clicking outside a specified element ref (e.g. menus/modals). */
export function useClickOutside(ref: React.RefObject<HTMLElement | null>, callback: () => void): void {
  const savedCallback = React.useRef(callback);

  React.useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        savedCallback.current();
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [ref]);
}

/** Bind a custom keyboard combination (e.g., "mod+s", "escape", "shift+z") to a callback. */
export function useKeyboardShortcut(
  keys: string,
  callback: (e: KeyboardEvent) => void,
  options: { disabled?: boolean } = {},
): void {
  const savedCallback = React.useRef(callback);

  React.useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  React.useEffect(() => {
    if (options.disabled) {return;}

    function handleKeyDown(e: KeyboardEvent) {
      const parts = keys.toLowerCase().split("+");
      const key = parts[parts.length - 1];
      const ctrl = parts.includes("ctrl") || parts.includes("control");
      const meta = parts.includes("meta") || parts.includes("cmd") || parts.includes("command");
      const shift = parts.includes("shift");
      const alt = parts.includes("alt");

      const matchesKey = e.key.toLowerCase() === key;
      const matchesCtrl = ctrl === (e.ctrlKey || false);
      const matchesMeta = meta === (e.metaKey || false);
      const matchesShift = shift === (e.shiftKey || false);
      const matchesAlt = alt === (e.altKey || false);

      const isMod = parts.includes("mod");
      const matchesMod = isMod ? (e.metaKey || e.ctrlKey) : true;

      if (matchesKey && matchesCtrl && matchesMeta && matchesShift && matchesAlt && matchesMod) {
        const target = e.target as HTMLElement;
        const typing =
          target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable;
        if (typing && keys.toLowerCase() !== "escape") {
          return;
        }

        e.preventDefault();
        savedCallback.current(e);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [keys, options.disabled]);
}

/** Retrieve the value of a prop/state from the previous render cycle. */
export function usePrevious<T>(value: T): T | undefined {
  const ref = React.useRef<T>();
  React.useEffect(() => {
    ref.current = value;
  }, [value]);
  return ref.current;
}

/** Monitor responsive browser viewport media queries dynamically. */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = React.useState(() => window.matchMedia(query).matches);

  React.useEffect(() => {
    const media = window.matchMedia(query);
    if (media.matches !== matches) {
      setMatches(media.matches);
    }
    const listener = (e: MediaQueryListEvent) => setMatches(e.matches);
    media.addEventListener("change", listener);
    return () => media.removeEventListener("change", listener);
  }, [query, matches]);

  return matches;
}
