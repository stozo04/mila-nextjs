import type { ButtonHTMLAttributes } from 'react';

export default function NavActionButton({
  className = '',
  type = 'button',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      type={type}
      className={`nav-link nav-action ${className}`.trim()}
    />
  );
}
