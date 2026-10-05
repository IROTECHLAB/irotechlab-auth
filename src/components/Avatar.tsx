interface Props {
  user?: { firstName?: string; lastName?: string; email?: string; avatar?: string | null };
  size?: number;
  className?: string;
}

export function Avatar({ user, size = 40, className = '' }: Props) {
  const initials = getInitials(user);
  const style = { width: size, height: size, fontSize: Math.round(size * 0.4) };

  if (user?.avatar && user.avatar.startsWith('data:image')) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={user.avatar}
        alt={initials}
        style={style}
        className={`rounded-full object-cover ${className}`}
      />
    );
  }

  return (
    <div
      style={style}
      className={`flex items-center justify-center rounded-full bg-neutral-200 font-semibold text-[rgb(var(--fg-muted))] ring-1 ring-neutral-300 ${className}`}
      aria-label={initials}
    >
      {initials}
    </div>
  );
}

function getInitials(user?: { firstName?: string; lastName?: string; email?: string }) {
  if (!user) return '?';
  const f = (user.firstName ?? '').trim();
  const l = (user.lastName ?? '').trim();
  if (f || l) {
    return ((f[0] ?? '') + (l[0] ?? '')).toUpperCase() || '?';
  }
  const e = (user.email ?? '').trim();
  return e ? e[0].toUpperCase() : '?';
}
