import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import type { JourneyCard } from '@/types/blog';

export default async function LaterYearPage({ params }: { params: Promise<{ year: string }> }) {
  const { year } = await params;
  if (!/^([4-9]|[1-9]\d+)-year$/.test(year)) notFound();
  const supabase = await createClient();
  const { data, error } = await supabase.from('journey_cards').select('title,message,slug,date')
    .eq('journey_type', year.replace('-', '_')).order('created_at');
  if (error) throw new Error('Unable to load journey cards.');
  return <div className="container py-5">
    <h1>My Journey at {year.split('-')[0]}</h1>
    <div className="row g-4 mt-3">{(data as JourneyCard[]).map(card => <div key={card.slug} className="col-md-6 col-lg-4">
      <div className="card h-100"><div className="card-body">
        <h2 className="h5">{card.title}</h2><p>{card.message}</p>
        <Link className="btn btn-primary" href={`/my-journey/${year}/${card.slug}`}>View</Link>
      </div></div>
    </div>)}</div>
  </div>;
}
