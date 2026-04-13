import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Fetch all centuries from Supabase with optional filters.
 * Falls back to static data if Supabase isn't configured.
 */
export async function fetchCenturies({
  country = null,
  player = null,
  minRuns = 100,
  maxRuns = 999,
  minYear = 1877,
  maxYear = 2030,
  limit = 5000
} = {}) {
  let query = supabase
    .from('centuries')
    .select('*')
    .gte('runs', minRuns)
    .lte('runs', maxRuns)
    .gte('year', minYear)
    .lte('year', maxYear)
    .order('runs', { ascending: false })
    .limit(limit);

  if (country) query = query.eq('country', country);
  if (player)  query = query.ilike('player', `%${player}%`);

  const { data, error } = await query;

  if (error) {
    console.error('Supabase error:', error);
    return null;
  }

  return data;
}

/**
 * Map a Supabase row back to the app's innings format.
 */
export function mapDbToInnings(row) {
  return {
    id:                row.id,
    player:            row.player,
    country:           row.country,
    runs:              row.runs,
    balls:             row.balls,
    minutes:           row.minutes,
    notOut:            row.not_out,
    opponent:          row.opponent,
    venue:             row.ground,
    year:              row.year,
    series:            row.series || '',
    matchResult:       row.match_result,
    tags:              row.tags || [],
    story:             row.story || '',
    culturalValidation: row.cultural_validation || 50,
    levers: {
      matchImpact:       row.lever_match_impact   || 50,
      conditions:        row.lever_conditions      || 50,
      clutchness:        row.lever_clutchness      || 50,
      narrative:         row.lever_narrative       || 50,
      historicalWeight:  row.lever_historical      || 50,
      perceivedGreatness:row.lever_greatness       || 50,
    },
  };
}
