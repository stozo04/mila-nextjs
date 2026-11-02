import { createClient } from '@/utils/supabase/server';
import LandingCarousel from '@/components/Home/LandingCarousel';
import MemoriesAtlas from '@/components/Search/MemoriesAtlas';

// Signed-out visitors keep the carousel; anyone signed in gets search anything.
export default async function Home() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user ? <MemoriesAtlas /> : <LandingCarousel />;
}
