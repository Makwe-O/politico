import { PartyLogo } from '../components/PartyLogo';
import { Loading, QueryError } from '../components/Status';
import { useParties } from '../data/hooks';

export function PartiesPage() {
  const parties = useParties();

  return (
    <>
      <title>Parties · Politico</title>
      <h1>Parties</h1>
      <p className="lead">Every registered political party.</p>

      {parties.isPending ? (
        <Loading />
      ) : parties.isError ? (
        <QueryError what="parties" error={parties.error} />
      ) : parties.data.length === 0 ? (
        <p className="empty">No parties have been registered yet.</p>
      ) : (
        <ul className="card-grid">
          {parties.data.map((party) => (
            <li key={party.id} className="card party-card">
              <PartyLogo name={party.name} logoUrl={party.logoUrl} size="lg" />
              <div>
                <h2 className="party-name">{party.name}</h2>
                <p className="muted">
                  <span className="visually-hidden">Headquarters: </span>
                  {party.hqAddress}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
