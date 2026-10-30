import { Banner } from './Banner';

export function Loading({ label = 'Loading…' }: { label?: string }) {
  return (
    <p className="loading" role="status">
      {label}
    </p>
  );
}

export function QueryError({ what, error }: { what: string; error: Error }) {
  return (
    <Banner kind="error">
      Couldn't load {what}: {error.message}
    </Banner>
  );
}
