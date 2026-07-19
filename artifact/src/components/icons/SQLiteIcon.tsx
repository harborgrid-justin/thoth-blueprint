interface SQLiteIconProps {
  className?: string;
}

import SQLiteLogo from "./SQLite-Logo.wine.svg";

export function SQLiteIcon({ className = "h-6 w-auto" }: SQLiteIconProps) {
  return <img src={SQLiteLogo} alt="SQLite" className={className} />;
}