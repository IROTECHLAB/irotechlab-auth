'use client';
import React from 'react';

export type WidgetVariant = 'brand' | 'light' | 'dark';
export type WidgetSize = 'sm' | 'md' | 'lg';
export type WidgetShape = 'pill' | 'rounded' | 'square';

interface Props {
  clientId: string;
  redirectUri?: string;
  scope?: string;
  state?: string;
  label?: string;
  variant?: WidgetVariant;
  size?: WidgetSize;
  shape?: WidgetShape;
  block?: boolean;
  iconOnly?: boolean;
  className?: string;
}

export function IrotechLabWidget({
  clientId,
  redirectUri,
  scope = 'openid profile email',
  state,
  label = 'Continue with IrotechLab',
  variant = 'brand',
  size = 'md',
  shape = 'rounded',
  block = false,
  iconOnly = false,
  className = '',
}: Props) {
  const params = new URLSearchParams({ client_id: clientId, scope });
  if (redirectUri) params.set('redirect_uri', redirectUri);
  if (state) params.set('state', state);

  const href = `/api/oauth/widget?${params.toString()}`;

  const cls = [
    'iro-widget',
    `iro-widget-${variant}`,
    `iro-widget-${size}`,
    `iro-widget-${shape}`,
    iconOnly && 'iro-widget-icon-only',
    block && 'iro-widget-block',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  const markSize = size === 'sm' ? 18 : size === 'lg' ? 26 : 22;

  return (
    <a href={href} className={cls} aria-label={label}>
      <span className="iro-widget-mark" style={{ width: markSize, height: markSize }}>
        <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" fill="none">
          <g fill="none" stroke="currentColor" strokeWidth="6" strokeLinejoin="round" strokeLinecap="round">
            <circle cx="50" cy="18" r="8" fill="currentColor" stroke="none" />
            <path d="M 25 30 L 75 30 L 75 55 Q 75 75 50 88 Q 25 75 25 55 Z" />
            <circle cx="50" cy="52" r="5" fill="currentColor" stroke="none" />
            <rect x="47.4" y="55" width="5" height="11" rx="2.5" fill="currentColor" stroke="none" />
          </g>
        </svg>
      </span>
      {!iconOnly && <span className="iro-widget-label">{label}</span>}
    </a>
  );
}
