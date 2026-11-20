import { avatarColor, onColor } from '@portfolio/tokens';
import type { UserSummary } from '@portfolio/schemas';

/** Avatar con iniciales sobre una forma orgánica (la API todavía no sirve fotos de perfil en la demo). */
export function Avatar({ user, size = 42 }: { user: Pick<UserSummary, 'name' | 'initials' | 'handle' | 'avatarUrl'>; size?: number }) {
  const bg = avatarColor(user.handle);
  const style = {
    width: size, height: size, flex: 'none', borderRadius: '46% 54% 50% 50%', background: bg, color: onColor(bg),
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: Math.round(size * 0.36),
    overflow: 'hidden',
  } as const;
  if (user.avatarUrl) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={user.avatarUrl} alt="" width={size} height={size} style={{ ...style, objectFit: 'cover' }} />;
  }
  return <span aria-hidden="true" style={style}>{user.initials}</span>;
}
