/**
 * PocketFlow logo: a budget split into parts. Same drawing as the app icons
 * (public/icons/*, app/icon.svg) — regenerate those if you change it.
 */
export function Logo({ className, title }: { className?: string; title?: string }) {
  return (
    <svg viewBox="0 0 512 512" className={className} role={title ? "img" : undefined} aria-hidden={title ? undefined : true}>
      {title && <title>{title}</title>}
      <rect width="512" height="512" rx="116" fill="#1c6853"/><path d="M272.98 135.19 A122.0 122.0 0 1 1 234.81 376.15" stroke="#fff" strokeOpacity="1.0" strokeWidth="74.0" strokeLinecap="butt" fill="none"/><path d="M202.52 365.65 A122.0 122.0 0 0 1 139.46 219.92" stroke="#fff" strokeOpacity="0.72" strokeWidth="74.0" strokeLinecap="butt" fill="none"/><path d="M153.91 189.20 A122.0 122.0 0 0 1 239.02 135.19" stroke="#fff" strokeOpacity="0.45" strokeWidth="74.0" strokeLinecap="butt" fill="none"/>
    </svg>
  );
}
