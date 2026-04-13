/**
 * Tons of Consequence â Volatility Engine
 * =========================================
 * Measures how much an innings' rank shifts across different
 * weighting perspectives. High volatility = "divisive innings" =
 * the ones that start the best arguments.
 */

import { calcToc, PRESETS } from './scoring';

/**
 * Calculate an innings' ToC score under every preset weighting.
 */
export function scoreAcrossPresets(innings) {
  return PRESETS.map(p => ({
    preset: p.label,
    emoji:  p.emoji,
    score:  calcToc(innings, p.w),
  }));
}

/**
 * Calculate the volatility of an innings across all preset weightings.
 * Returns a 0â100 volatility score and the full spread.
 *
 * High volatility = the weighting profile dramatically changes whether
 * this innings is seen as great. These are the "it depends" innings.
 *
 * Low volatility = universally recognised. These are the untouchables.
 */
export function calcVolatility(innings) {
  const scores = scoreAcrossPresets(innings);
  const values = scores.map(s => s.score);
  const min    = Math.min(...values);
  const max    = Math.max(...values);
  const spread = max - min;

  // Normalise to 0â100 (max possible spread is ~60 points)
  const volatility = Math.round(Math.min(100, (spread / 60) * 100));

  const bestFor  = scores.reduce((a, b) => a.score > b.score ? a : b);
  const worstFor = scores.reduce((a, b) => a.score < b.score ? a : b);

  return {
    volatility,
    spread: Math.round(spread * 10) / 10,
    min:    Math.round(min * 10) / 10,
    max:    Math.round(max * 10) / 10,
    scores,
    bestFor,
    worstFor,
  };
}

/**
 * Volatility tier label.
 */
export function volatilityTier(v) {
  if (v >= 70) return { label: 'HIGHLY DIVISIVE',   color: '#e8382e', desc: 'This innings divides opinion sharply. Your values change everything.' };
  if (v >= 45) return { label: 'CONTESTED',          color: '#f5c800', desc: 'Reasonable people disagree on this one.' };
  if (v >= 20) return { label: 'BROADLY AGREED',     color: '#38bde8', desc: 'Some variation, but most perspectives rate this similarly.' };
  return             { label: 'UNIVERSALLY GREAT',   color: '#2dd65a', desc: 'Almost everyone agrees. This innings transcends the debate.' };
}

/**
 * Sort a list of innings by volatility (most divisive first).
 */
export function sortByVolatility(innings) {
  return [...innings]
    .map(i => ({ ...i, vol: calcVolatility(i) }))
    .sort((a, b) => b.vol.volatility - a.vol.volatility);
}

/**
 * Generate a written head-to-head verdict between two innings.
 * Used in the compare view.
 */
export function writeVerdict(inningsA, inningsB, weights) {
  const tocA = calcToc(inningsA, weights);
  const tocB = calcToc(inningsB, weights);
  const winner = tocA > tocB ? inningsA : inningsB;
  const loser  = tocA > tocB ? inningsB : inningsA;
  const margin = Math.abs(Math.round((tocA - tocB) * 10) / 10);

  // Find the lever with the biggest gap between them
  const leverKeys = Object.keys(weights);
  let biggestGapKey = null;
  let biggestGap = 0;
  let winnerLever = 0;
  let loserLever  = 0;

  leverKeys.forEach(k => {
    const gap = Math.abs((inningsA.levers[k] || 0) - (inningsB.levers[k] || 0));
    if (gap > biggestGap) {
      biggestGap    = gap;
      biggestGapKey = k;
      winnerLever   = winner.levers[k] || 0;
      loserLever    = loser.levers[k]  || 0;
    }
  });

  const leverNames = {
    matchImpact:       'Match Impact',
    conditions:        'Conditions & Opposition',
    clutchness:        'Clutchness',
    narrative:         'Narrative',
    historicalWeight:  'Historical Weight',
    perceivedGreatness:'Perceived Greatness',
  };

  const leverName = leverNames[biggestGapKey] || biggestGapKey;

  // Build verdict sentences
  const runDesc = a => `${a.runs}${a.notOut ? '*' : ''}`;

  let verdict;
  if (margin < 1) {
    verdict = `Dead heat â on your settings, ${inningsA.player}'s ${runDesc(inningsA)} and ${inningsB.player}'s ${runDesc(inningsB)} are essentially tied. The pub argument is yours to resolve.`;
  } else if (margin < 4) {
    verdict = `Narrow call. ${winner.player}'s ${runDesc(winner)} edges it by ${margin} points â largely on ${leverName} (${winnerLever} vs ${loserLever}). Plenty of room for a second opinion.`;
  } else {
    verdict = `On your settings, ${winner.player}'s ${runDesc(winner)} wins clearly â ${margin} points clear, with a decisive advantage in ${leverName} (${winnerLever} vs ${loserLever}). ${loser.player}'s ${runDesc(loser)} would need you to weight ${margin < 8 ? 'a couple of' : 'very different'} levers differently to change that verdict.`;
  }

  return {
    winner,
    loser,
    tocA: Math.round(tocA * 10) / 10,
    tocB: Math.round(tocB * 10) / 10,
    margin,
    biggestGapLever: leverName,
    verdict,
  };
}
