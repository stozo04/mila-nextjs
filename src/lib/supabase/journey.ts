import { createClient } from '@supabase/supabase-js'
import { JourneyCard } from '../../types/blog'

// Assuming you have these environment variables set
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

const supabase = createClient(supabaseUrl, supabaseAnonKey)

export const enum JourneyType {
  FIRST_YEAR = 'first_year',
  ONE_YEAR = 'one_year',
  TWO_YEAR = 'two_year'
}

export interface JourneyCardDB extends JourneyCard {
  id: number
  journey_type: JourneyType
  created_at: string
  updated_at: string
}

export async function getJourneyCards(journeyType: JourneyType): Promise<JourneyCard[]> {
  const { data, error } = await supabase
    .from('journey_cards')
    .select('title, message, slug, date, created_at')
    .eq('journey_type', journeyType)
    .order('created_at', { ascending: true })

  if (error) {
    console.error('Error fetching journey cards:', error)
    return []
  }

  return data || []
}

// Function to insert journey cards in bulk
export async function insertJourneyCards(cards: JourneyCard[], journeyType: JourneyType) {
  const cardsToInsert = cards.map(card => ({
    ...card,
    journey_type: journeyType
  }))

  const { data, error } = await supabase
    .from('journey_cards')
    .insert(cardsToInsert)
    .select()

  if (error) {
    console.error('Error inserting journey cards:', error)
    return null
  }

  return data
}

// Function to update a journey card
export async function updateJourneyCard(slug: string, updates: Partial<JourneyCard>) {
  const { data, error } = await supabase
    .from('journey_cards')
    .update(updates)
    .eq('slug', slug)
    .select()

  if (error) {
    console.error('Error updating journey card:', error)
    return null
  }

  return data?.[0]
}

// Function to delete a journey card
export async function deleteJourneyCard(slug: string) {
  const { error } = await supabase
    .from('journey_cards')
    .delete()
    .eq('slug', slug)

  if (error) {
    console.error('Error deleting journey card:', error)
    return false
  }

  return true
} 