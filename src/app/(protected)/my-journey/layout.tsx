import { createClient } from '@/utils/supabase/server';
import Link from 'next/link';

export default async function JourneyLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: cards } = user ? await supabase.from('journey_cards').select('journey_type') : { data: [] };
  const laterYears = [...new Set((cards ?? []).map(card => String(card.journey_type)))]
    .filter(year => /^([4-9]|[1-9]\d+)_year$/.test(year)).sort((a, b) => parseInt(a) - parseInt(b));
  return <>
    {laterYears.length > 0 && <nav className="container pt-3 d-flex gap-3" aria-label="Later journey years">
      {laterYears.map(year => <Link key={year} href={`/my-journey/${year.replace('_', '-')}`}>Age {parseInt(year)}</Link>)}
    </nav>}
    {children}
  </>;
}
