import { CreateOfficeForm } from './CreateOfficeForm';
import { PartiesAdmin } from './PartiesAdmin';
import { RegisterCandidateForm } from './RegisterCandidateForm';

export function AdminPage() {
  return (
    <>
      <title>Admin · Politico</title>
      <h1>Admin</h1>
      <p className="lead">Manage parties and offices, and register candidates.</p>
      <PartiesAdmin />
      <CreateOfficeForm />
      <RegisterCandidateForm />
    </>
  );
}
