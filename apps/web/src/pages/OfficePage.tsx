import { useState } from 'react';
import { Link, useParams } from 'react-router';
import { IdParams, type Candidate, type OfficeResult } from '@politico/shared';
import { ApiError } from '../api';
import { Banner, FeedbackBanner, type Feedback } from '../components/Banner';
import { loginPath } from '../components/guards';
import { PartyLogo } from '../components/PartyLogo';
import { Loading, QueryError } from '../components/Status';
import {
  RESULTS_REFRESH_MS,
  useCandidates,
  useCastVote,
  useMe,
  useMyVotes,
  useOffice,
  useResults,
} from '../data/hooks';
import { OFFICE_TYPE_LABELS, formatPercent, formatVotes, fullName } from '../format';
import { NotFoundPage } from './NotFoundPage';

export function OfficePage() {
  const parsed = IdParams.safeParse(useParams());
  if (!parsed.success) return <NotFoundPage title="Office not found" />;
  // Keyed so banners and mutation state reset when moving between offices.
  return <OfficeDetail key={parsed.data.id} officeId={parsed.data.id} />;
}

function OfficeDetail({ officeId }: { officeId: number }) {
  const office = useOffice(officeId);

  if (office.isPending) return <Loading />;
  if (office.isError) {
    return office.error instanceof ApiError && office.error.status === 404 ? (
      <NotFoundPage title="Office not found" message="That office doesn't exist (any more)." />
    ) : (
      <QueryError what="this office" error={office.error} />
    );
  }

  const { name, type } = office.data;
  return (
    <>
      <title>{`${name} · Politico`}</title>
      <nav aria-label="Breadcrumb" className="breadcrumb">
        <Link to="/">Offices</Link> <span aria-hidden="true">/</span> {OFFICE_TYPE_LABELS[type]}
      </nav>
      <h1>{name}</h1>
      <p>
        <span className="badge">{OFFICE_TYPE_LABELS[type]} office</span>
      </p>
      <Ballot officeId={officeId} />
      <Results officeId={officeId} />
    </>
  );
}

function Ballot({ officeId }: { officeId: number }) {
  const candidates = useCandidates(officeId);
  const me = useMe();
  const user = me.data;
  const myVotes = useMyVotes({ enabled: !!user });
  const vote = useCastVote(officeId);
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  const myVote = myVotes.data?.find((v) => v.office.id === officeId);
  // Wait for /me/votes before enabling anything, so a returning voter never sees live buttons.
  const canVote = !!user && myVotes.isSuccess && !myVote && !vote.isPending;

  function cast(candidate: Candidate) {
    setFeedback(null);
    vote.mutate(
      { candidateId: candidate.id },
      {
        onSuccess: () =>
          setFeedback({
            kind: 'success',
            text: `Your vote for ${fullName(candidate.user)} has been recorded.`,
          }),
        onError: (err) => setFeedback({ kind: 'error', text: err.message }),
      },
    );
  }

  return (
    <section aria-labelledby="candidates-heading" className="section">
      <h2 id="candidates-heading">Candidates</h2>
      <FeedbackBanner feedback={feedback} />
      {/* Right after voting the success banner already says it; don't repeat it. */}
      {myVote && feedback?.kind !== 'success' && (
        <Banner kind="info">You voted for {myVote.candidate.name}.</Banner>
      )}
      {myVotes.isError && <QueryError what="your votes" error={myVotes.error} />}
      {me.isSuccess && !user && (
        <p>
          <Link to={loginPath(`/offices/${officeId}`)} className="button">
            Log in to vote
          </Link>
        </p>
      )}

      {candidates.isPending ? (
        <Loading />
      ) : candidates.isError ? (
        <QueryError what="candidates" error={candidates.error} />
      ) : candidates.data.length === 0 ? (
        <p className="empty">No candidates have been registered for this office yet.</p>
      ) : (
        <ul className="candidate-list">
          {candidates.data.map((candidate) => {
            const name = fullName(candidate.user);
            return (
              <li key={candidate.id} className="candidate card">
                <PartyLogo name={candidate.party.name} logoUrl={candidate.party.logoUrl} />
                <div className="candidate-info">
                  <p className="candidate-name">{name}</p>
                  <p className="muted">{candidate.party.name}</p>
                </div>
                {user &&
                  (myVote?.candidate.id === candidate.id ? (
                    <span className="badge badge-success">Your vote</span>
                  ) : (
                    <button
                      type="button"
                      className="button"
                      aria-label={`Vote for ${name}`}
                      disabled={!canVote}
                      onClick={() => cast(candidate)}
                    >
                      Vote
                    </button>
                  ))}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function Results({ officeId }: { officeId: number }) {
  const results = useResults(officeId);

  return (
    <section aria-labelledby="results-heading" className="section">
      <h2 id="results-heading">Results</h2>
      {results.isPending ? (
        <Loading label="Loading results…" />
      ) : results.isError && !results.data ? (
        <QueryError what="results" error={results.error} />
      ) : (
        <ResultBars rows={results.data ?? []} />
      )}
      <p className="hint">Updates every {RESULTS_REFRESH_MS / 1000} seconds.</p>
    </section>
  );
}

/** One horizontal bar per candidate, as a share of all votes cast in the office. */
function ResultBars({ rows }: { rows: OfficeResult[] }) {
  const total = rows.reduce((sum, row) => sum + row.votes, 0);
  if (total === 0) {
    return (
      <p className="empty">No votes yet. Results appear here as soon as the first vote is in.</p>
    );
  }

  return (
    <>
      <ol className="results-list">
        {rows.map((row) => {
          const share = row.votes / total;
          return (
            <li key={row.candidateId} className="result">
              <div className="result-head">
                <span className="result-name">
                  {row.candidateName} <span className="muted">({row.partyName})</span>
                </span>
                <span className="result-figures">
                  <span>{formatVotes(row.votes)}</span>
                  <span className="result-percent">{formatPercent(share)}</span>
                </span>
              </div>
              <div className="result-track" aria-hidden="true">
                <div className="result-bar" style={{ width: `${share * 100}%` }} />
              </div>
            </li>
          );
        })}
      </ol>
      <p className="results-total">
        Total votes: <strong>{total.toLocaleString('en')}</strong>
      </p>
    </>
  );
}
