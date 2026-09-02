import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import Header from '@/components/BabyShower/Header';
import JourneyGallery from '@/components/Journey/JourneyGallery';

export default async function LaterCardPage({ params }: { params: Promise<{ year: string; slug: string }> }) {
  const { year, slug } = await params;
  if (!/^([4-9]|[1-9]\d+)-year$/.test(year)) notFound();
  const supabase = await createClient();
  const { data: card, error } = await supabase.from('journey_cards').select('title,message,date')
    .eq('journey_type', year.replace('-', '_')).eq('slug', slug).maybeSingle();
  if (error) throw new Error('Unable to load journey card.');
  if (!card) notFound();
  return <div className="container py-5">
    <Link href={`/my-journey/${year}`}>Back to year</Link>
    <Header title={card.message || card.title} date={card.date} />
    <JourneyGallery slug={slug} />
  </div>;
}
