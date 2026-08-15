import { Link } from 'react-router-dom';
import type { ReactNode } from 'react';

export function StoreLink({
  to,
  className,
  children,
}: {
  to: string;
  className?: string;
  children: ReactNode;
}) {
  if (/^https?:\/\//i.test(to)) {
    return (
      <a className={className} href={to} target="_blank" rel="noreferrer">
        {children}
      </a>
    );
  }
  return (
    <Link className={className} to={to || '/'}>
      {children}
    </Link>
  );
}
