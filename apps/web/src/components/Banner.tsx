import type { ReactNode } from 'react';

export type BannerKind = 'success' | 'error' | 'info';

export interface Feedback {
  kind: BannerKind;
  text: string;
}

/** Inline feedback. Errors are `role="alert"` (assertive), everything else `role="status"`. */
export function Banner({ kind, children }: { kind: BannerKind; children: ReactNode }) {
  return (
    <div className={`banner banner-${kind}`} role={kind === 'error' ? 'alert' : 'status'}>
      {children}
    </div>
  );
}

export function FeedbackBanner({ feedback }: { feedback: Feedback | null }) {
  return feedback ? <Banner kind={feedback.kind}>{feedback.text}</Banner> : null;
}
