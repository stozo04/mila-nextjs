import { authorizeAdmin } from '@/utils/supabase/server';
import PeopleAdmin from './PeopleAdmin';

export default async function PeoplePage() {
  const supabase = await authorizeAdmin();
  if (supabase instanceof Response) {
    const message = supabase.status === 503 ? 'Admin actions are unavailable right now.' : 'Only Steven can manage people.';
    return <main className="container my-5" style={{ maxWidth: 640 }}>
      <h1 className="h3">People</h1>
      <p role="alert">{message}</p>
    </main>;
  }
  return <PeopleAdmin />;
}
