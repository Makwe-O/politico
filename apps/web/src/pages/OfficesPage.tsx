import { Link } from 'react-router';
import { OfficeType } from '@politico/shared';
import { Loading, QueryError } from '../components/Status';
import { useOffices } from '../data/hooks';
import { OFFICE_TYPE_LABELS } from '../format';

export function OfficesPage() {
  const offices = useOffices();

  return (
    <>
      <title>Offices · Politico</title>
      <h1>Offices</h1>
      <p className="lead">
        Pick an office to see its candidates, cast your vote and follow the results.
      </p>

      {offices.isPending ? (
        <Loading />
      ) : offices.isError ? (
        <QueryError what="offices" error={offices.error} />
      ) : offices.data.length === 0 ? (
        <p className="empty">No offices yet. Check back once the electoral body has added some.</p>
      ) : (
        OfficeType.options.map((type) => {
          const group = offices.data.filter((office) => office.type === type);
          if (group.length === 0) return null;
          const headingId = `office-type-${type}`;
          return (
            <section key={type} aria-labelledby={headingId} className="office-group">
              <h2 id={headingId}>{OFFICE_TYPE_LABELS[type]}</h2>
              <ul className="office-list">
                {group.map((office) => (
                  <li key={office.id}>
                    <Link to={`/offices/${office.id}`} className="office-link">
                      {office.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          );
        })
      )}
    </>
  );
}
