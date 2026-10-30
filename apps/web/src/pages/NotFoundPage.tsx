import { Link, isRouteErrorResponse, useRouteError } from 'react-router';

export function NotFoundPage({
  title = 'Page not found',
  message = "We couldn't find what you were looking for.",
}: {
  title?: string;
  message?: string;
}) {
  return (
    <section className="notice-page">
      <title>{`${title} · Politico`}</title>
      <h1>{title}</h1>
      <p>{message}</p>
      <p>
        <Link to="/">Back to offices</Link>
      </p>
    </section>
  );
}

/** Route `errorElement`: something threw while rendering. */
export function ErrorPage() {
  const error = useRouteError();
  const detail = isRouteErrorResponse(error)
    ? `${error.status} ${error.statusText}`
    : error instanceof Error
      ? error.message
      : 'Unknown error';
  return (
    <section className="notice-page" role="alert">
      <title>Something went wrong · Politico</title>
      <h1>Something went wrong</h1>
      <p>{detail}</p>
      <p>
        <a href="/">Reload the app</a>
      </p>
    </section>
  );
}
