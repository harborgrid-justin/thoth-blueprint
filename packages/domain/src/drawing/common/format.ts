/** Escape XML special characters. */
export function xmlEscape(s: string): string {
  return s.replace(/[<>&"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

/** Format a safe XML/COLLADA ID string. */
export function safeId(name: string, index: number): string {
  const base = name.replace(/[^A-Za-z0-9_]/g, "_") || "mesh";
  return `${base}_${index}`;
}
