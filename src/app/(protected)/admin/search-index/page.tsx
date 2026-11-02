import { authorizeAdmin } from '@/utils/supabase/server';
import SearchIndexAdmin from './SearchIndexAdmin';

export default async function SearchIndexPage() {
  const supabase = await authorizeAdmin();
  if (supabase instanceof Response) {
    const message = supabase.status === 503 ? 'Admin actions are unavailable right now.' : 'Only Steven can build the search index.';
    return <main className="container my-5" style={{ maxWidth: 640 }}>
      <h1 className="h3">Search index</h1>
      <p role="alert">{message}</p>
    </main>;
  }
  return <SearchIndexAdmin />;
}
