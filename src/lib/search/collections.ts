// What search anything covers, shared by the atlas, the search API, and the index page.
// Storage photos are keyed by object name; images built into the site by their path.

export const COLLECTIONS = [
  { id: 'journey', label: 'Monthly journey' },
  { id: 'sonograms', label: 'Sonograms' },
  { id: 'baby-shower', label: 'Baby shower' },
  { id: 'gender-reveal', label: 'Gender reveal' },
  { id: 'homepage', label: 'Homepage' },
  { id: 'letters', label: 'Letters' },
] as const;

export type CollectionId = (typeof COLLECTIONS)[number]['id'];
export type PhotoCollection = Exclude<CollectionId, 'letters'>;

const SONOGRAM_COUNTS = [9, 11, 13, 5, 5]; // public/images/sonograms/sonogram-<n>/<1..count>.jpg
const range = (count: number) => Array.from({ length: count }, (_, index) => index + 1);

export const SITE_PHOTOS: { key: string; collection: PhotoCollection }[] = [
  ...range(14).map(n => ({ key: `/images/landing-page/${n}.jpg`, collection: 'homepage' as const })),
  ...SONOGRAM_COUNTS.flatMap((count, index) => range(count).map(n =>
    ({ key: `/images/sonograms/sonogram-${index + 1}/${n}.jpg`, collection: 'sonograms' as const }))),
];

export const isSitePhoto = (key: string) => key.startsWith('/');

export function photoUrl(key: string) {
  if (isSitePhoto(key)) return key;
  const path = key.split('/').map(encodeURIComponent).join('/');
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/mila_storage_bucket/${path}`;
}

export const thumbPathFor = (key: string) => `search/thumbs/${isSitePhoto(key) ? `site${key}` : key}.webp`;

export const thumbUrl = (thumbPath: string) => photoUrl(thumbPath);

// Same mapping as mila_month_preview's section column.
function journeySection(journeyType: string) {
  const fixed: Record<string, string> = { first_year: 'first-year', one_year: 'one-year', two_year: 'second-year', three_year: 'third-year' };
  return fixed[journeyType] ?? (/^\d+_year$/.test(journeyType) ? journeyType.replace('_', '-') : null);
}

export type JourneyCards = Map<string, string>; // slug -> journey_type

// Where a photo lives on the site, for the viewer's link. Homepage photos and months
// without a journey card have none.
export function photoSource(key: string, cards: JourneyCards): { href: string; label: string } | null {
  const sonogram = key.match(/^\/images\/sonograms\/sonogram-(\d+)\//);
  if (sonogram) return { href: `/sonograms/${sonogram[1]}`, label: `Go to Sonogram ${sonogram[1]}` };
  const [top, folder] = key.split('/');
  if (top === 'gender-reveal') return { href: '/gender-reveal', label: 'Go to the gender reveal' };
  if (top === 'baby-shower' && (folder === 'dallas' || folder === 'houston')) {
    return { href: `/baby-shower/${folder}`, label: `Go to the ${folder === 'dallas' ? 'Dallas' : 'Houston'} baby shower` };
  }
  if (top !== 'birthday') return null;
  if (folder === 'delivery-day') return { href: '/my-journey/birthday', label: "Go to Mila's birthday" };
  const journeyType = cards.get(folder);
  const section = journeyType && journeySection(journeyType);
  return section ? { href: `/my-journey/${section}/${folder}`, label: 'Go to this month' } : null;
}
