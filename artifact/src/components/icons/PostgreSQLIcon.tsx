interface PostgreSQLIconProps {
  className?: string;
}

import PostgresLogo from "./PostgreSQL-Logo.wine.svg";

export function PostgreSQLIcon({ className = "h-6 w-auto" }: PostgreSQLIconProps) {
  return <img src={PostgresLogo} alt="PostgreSQL" className={className} />;
}