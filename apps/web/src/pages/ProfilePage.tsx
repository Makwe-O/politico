import { Link } from 'react-router';
import { Loading, QueryError } from '../components/Status';
import { useMe, useMyVotes } from '../data/hooks';
import { OFFICE_TYPE_LABELS, formatDate, formatDateTime, fullName } from '../format';

/** Rendered inside RequireAuth, so `me` is always set here. */
export function ProfilePage() {
  const { data: me } = useMe();
  const votes = useMyVotes({ enabled: !!me });
  if (!me) return null;

  return (
    <>
      <title>Profile · Politico</title>
      <h1>{fullName(me)}</h1>

      <section aria-labelledby="details-heading" className="section">
        <h2 id="details-heading">Your details</h2>
        <dl className="details card">
          <div>
            <dt>Email</dt>
            <dd>{me.email}</dd>
          </div>
          <div>
            <dt>Role</dt>
            <dd className="capitalize">{me.role}</dd>
          </div>
          <div>
            <dt>Member since</dt>
            <dd>
              <time dateTime={me.createdAt}>{formatDate(me.createdAt)}</time>
            </dd>
          </div>
        </dl>
      </section>

      <section aria-labelledby="votes-heading" className="section">
        <h2 id="votes-heading">Your votes</h2>
        {votes.isPending ? (
          <Loading />
        ) : votes.isError ? (
          <QueryError what="your votes" error={votes.error} />
        ) : votes.data.length === 0 ? (
          <p className="empty">
            You haven't voted yet. <Link to="/">Browse the offices</Link> to cast your first vote.
          </p>
        ) : (
          <div className="table-wrap" role="region" aria-label="Votes table" tabIndex={0}>
            <table className="table">
              <thead>
                <tr>
                  <th scope="col">Office</th>
                  <th scope="col">Type</th>
                  <th scope="col">Candidate</th>
                  <th scope="col">Party</th>
                  <th scope="col">Date</th>
                </tr>
              </thead>
              <tbody>
                {votes.data.map((vote) => (
                  <tr key={vote.voteId}>
                    <td>
                      <Link to={`/offices/${vote.office.id}`}>{vote.office.name}</Link>
                    </td>
                    <td>{OFFICE_TYPE_LABELS[vote.office.type]}</td>
                    <td>{vote.candidate.name}</td>
                    <td>{vote.candidate.partyName}</td>
                    <td>
                      <time dateTime={vote.createdAt}>{formatDateTime(vote.createdAt)}</time>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
