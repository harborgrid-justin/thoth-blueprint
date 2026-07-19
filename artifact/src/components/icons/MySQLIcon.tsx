interface MySQLIconProps {
  className?: string;
}

import MySQLLogo from "./MySQL-Logo.wine.svg";

export function MySQLIcon({ className = "h-6 w-auto" }: MySQLIconProps) {
  return <img src={MySQLLogo} alt="MySQL" className={className} />;
}