import { useState } from 'react';
import { initials } from '../format';

interface PartyLogoProps {
  name: string;
  logoUrl: string | null;
  size?: 'sm' | 'md' | 'lg';
}

/**
 * The party's logo, or its initials when there's no logo (or it fails to load).
 * Decorative: the party name is always shown next to it.
 */
export function PartyLogo({ name, logoUrl, size = 'md' }: PartyLogoProps) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);

  if (logoUrl && failedSrc !== logoUrl) {
    return (
      <img
        className={`logo logo-${size}`}
        src={logoUrl}
        alt=""
        loading="lazy"
        onError={() => setFailedSrc(logoUrl)}
      />
    );
  }
  return (
    <span className={`logo logo-${size} logo-initials`} aria-hidden="true">
      {initials(name)}
    </span>
  );
}
