interface MSSQLIconProps {
  className?: string;
}

import MSSQLLogo from "./mssql.svg";

export function MSSQLIcon({ className = "h-6 w-auto" }: MSSQLIconProps) {
  return <img src={MSSQLLogo} alt="Microsoft SQL Server" className={className} />;
}