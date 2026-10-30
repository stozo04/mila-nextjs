import type { authorizeAdmin } from '@/utils/supabase/server';
import { thumbUrl } from '@/lib/search/collections';
import type { PeopleList } from './types';

export type AdminClient = Exclude<Awaited<ReturnType<typeof authorizeAdmin>>, Response>;

type Raw = {
  people: { id: string; name: string; photos: number; faces: number; thumb: string | null }[];
  groups: { id: string; faces: number; thumbs: string[] | null; hidden: boolean }[];
  scanned: number;
  photos: number;
};

const url = (path: string | null) => (path ? thumbUrl(path) : null);

export async function readPeople(supabase: AdminClient, includeHidden: boolean) {
  const { data, error } = await supabase.rpc('people_list', { include_hidden: includeHidden });
  if (error) return null;
  const raw = data as Raw;
  return {
    people: raw.people.map(person => ({ ...person, thumb: url(person.thumb) })),
    groups: raw.groups.map(group => ({ ...group, thumbs: (group.thumbs ?? []).map(path => thumbUrl(path)) })),
    scanned: raw.scanned,
    photos: raw.photos,
  } satisfies PeopleList;
}

