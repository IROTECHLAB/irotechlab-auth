'use client';
import React from 'react';

export type Variant = 'primary' | 'light' | 'dark';
export type Size = 'sm' | 'md' | 'lg';

interface Props {
  href?: string;
  variant?: Variant;
  size?: Size;
  block?: boolean;
  label?: string;
  onClick?: () => void;
  className?: string;
}

export function IrotechLabButton({
  href = '/login',
  variant = 'primary',
  size = 'md',
  block = false,
  label = 'Sign in with IrotechLab',
  onClick,
  className = '',
}: Props) {
  const cls = [
    'iro-btn',
    `iro-btn-${variant}`,
    `iro-btn-${size}`,
    block && 'iro-btn-block',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  const markSize = size === 'sm' ? 18 : size === 'lg' ? 26 : 22;

  return (
    <a href={href} className={cls} aria-label={label} onClick={onClick}>
      <span className="iro-btn-mark" style={{ width: markSize, height: markSize }}>
        <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" fill="none">
          <g fill="none" stroke="currentColor" strokeWidth="6" strokeLinejoin="round" strokeLinecap="round">
            <circle cx="50" cy="18" r="8" fill="currentColor" stroke="none" />
            <path d="M 25 30 L 75 30 L 75 55 Q 75 75 50 88 Q 25 75 25 55 Z" />
            <circle cx="50" cy="52" r="5" fill="currentColor" stroke="none" />
            <rect x="47.4" y="55" width="5" height="11" rx="2.5" fill="currentColor" stroke="none" />
          </g>
        </svg>
      </span>
      <span>{label}</span>
    </a>
  );
}
