interface Props {
  name: 'pen' | 'link' | 'lock' | 'grid' | 'calendar' | 'palette' | 'graph';
  size?: number;
}

export function Glyph({ name, size = 16 }: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="text-accent shrink-0"
    >
      {name === 'pen' && (
        <>
          <path d="M12 20h9" />
          <path d="M16.5 3.5a2.1 2.1 0 1 1 3 3L7 19l-4 1 1-4Z" />
        </>
      )}
      {name === 'link' && (
        <>
          <path d="M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1" />
          <path d="M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1" />
        </>
      )}
      {name === 'lock' && (
        <>
          <rect x="4" y="11" width="16" height="10" rx="2" />
          <path d="M8 11V7a4 4 0 1 1 8 0v4" />
        </>
      )}
      {name === 'grid' && (
        <>
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <rect x="6" y="6" width="5" height="5" rx="0.5" />
          <rect x="13" y="13" width="5" height="5" rx="0.5" />
          <path d="m11 8 2 5" />
        </>
      )}
      {name === 'calendar' && (
        <>
          <rect x="3" y="5" width="18" height="16" rx="2" />
          <path d="M3 9h18M8 3v4M16 3v4" />
        </>
      )}
      {name === 'palette' && (
        <>
          <circle cx="13.5" cy="6.5" r="1" />
          <circle cx="17.5" cy="10.5" r="1" />
          <circle cx="6.5" cy="12.5" r="1" />
          <circle cx="8.5" cy="7.5" r="1" />
          <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.6 0 1-.4 1-1 0-.3-.1-.5-.3-.7a.95.95 0 0 1-.2-.6c0-.6.4-1 1-1H15c3.3 0 6-2.7 6-6 0-5-4.5-9-9-9Z" />
        </>
      )}
      {name === 'graph' && (
        <>
          <circle cx="6" cy="18" r="2.5" />
          <circle cx="18" cy="18" r="2.5" />
          <circle cx="12" cy="6" r="2.5" />
          <path d="m11 8-4 8M13 8l4 8M8 18h8" />
        </>
      )}
    </svg>
  );
}
