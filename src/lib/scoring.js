export const LEVERS = [
  { key:'matchImpact', name:'Match Impact', icon:'🎯', color:'#f5c800', description:'Win probability added, partnership value, whether the innings directly changed the match result.' },
  { key:'conditions', name:'Conditions & Opposition', icon:'🌩️', color:'#38bde8', description:'Pitch difficulty, quality of the bowling attack, weather and overhead conditions.' },
  { key:'clutchness', name:'Clutchness', icon:'⚡', color:'#e8382e', description:'The pressure index — team situation when the batter walked in, must-win context, series stakes.' },
  { key:'narrative', name:'Narrative', icon:'📖', color:'#d08840', description:'The human story: debut, comeback, redemption arc, farewell, playing through adversity.' },
  { key:'historicalWeight', name:'Historical Weight', icon:'🏛️', color:'#a06ee8', description:'Records set, rivalry significance, ground lore, where this sits in cricket timeline.' },
  { key:'perceivedGreatness', name:'Perceived Greatness', icon:'⭐', color:'#2dd65a', description:'How often this innings appears in greatest ever lists, fan polls, retrospective analysis.' },
];

export const DEFAULT_WEIGHTS = {
  matchImpact:20, conditions:15, clutchness:20,
  narrative:20, historicalWeight:15, perceivedGreatness:10,
};

export const PRESETS = [
  { label:'Default', emoji:'🏏', w:{ matchImpact:20, conditions:15, clutchness:20, narrative:20, historicalWeight:15, perceivedGreatness:10 } },
  { label:'The Purist', emoji:'📐', w:{ matchImpact:30, conditions:25, clutchness:25, narrative:5, historicalWeight:10, perceivedGreatness:5 } },
  { label:'The Romantic', emoji:'✍️', w:{ matchImpact:10, conditions:5, clutchness:15, narrative:35, historicalWeight:20, perceivedGreatness:15 } },
  { label:'The Analyst', emoji:'📊', w:{ matchImpact:35, conditions:30, clutchness:20, narrative:5, historicalWeight:5, perceivedGreatness:5 } },
  { label:'The Patriot', emoji:'🦘', w:{ matchImpact:15, conditions:10, clutchness:20, narrative:20, historicalWeight:25, perceivedGreatness:10 } },
];

export function calcToc(innings, weights) {
  const total = Object.values(weights).reduce((a,b) => a+b, 0);
  if (!total) return 0;
  return Math.round(Object.keys(weights).reduce((acc,k) => acc+((innings.levers[k]||0)*weights[k])/total, 0)*10)/10;
}

export function scoreColor(s) {
  if (s>=90) return '#f5c800';
  if (s>=82) return '#2dd65a';
  if (s>=72) return '#38bde8';
  return '#c0c0d0';
}

export function scoreTier(s) {
  if (s>=90) return 'LEGENDARY';
  if (s>=82) return 'ELITE';
  if (s>=72) return 'GREAT';
  return 'NOTABLE';
}

export function encodeWeights(w) {
  const k={matchImpact:'mi',conditions:'co',clutchness:'cl',narrative:'na',historicalWeight:'hi',perceivedGreatness:'pg'};
  return Object.entries(k).map(([key,s])=>s+':'+w[key]).join(',');
}

export function decodeWeights(str) {
  if (!str) return DEFAULT_WEIGHTS;
  const k={mi:'matchImpact',co:'conditions',cl:'clutchness',na:'narrative',hi:'historicalWeight',pg:'perceivedGreatness'};
  const w={...DEFAULT_WEIGHTS};
  try { str.split(',').forEach(p=>{const[s,v]=p.split(':');if(k[s])w[k[s]]=parseInt(v,10)||0;}); } catch(_){}
  return w;
}

export const FLAGS = {AUS:'🇦🇺',ENG:'🏴󠁧󠁢󠁥󠁮󠁧󠁿',WI:'🏝️',IND:'🇮🇳',SA:'🇿🇦',PAK:'🇵🇰',NZ:'🇳🇿',SL:'🇱🇰',ZIM:'🇿🇼',BAN:'🇧🇩'};
export const NATIONS = {AUS:'Australia',ENG:'England',WI:'West Indies',IND:'India',SA:'South Africa',PAK:'Pakistan',NZ:'New Zealand',SL:'Sri Lanka',ZIM:'Zimbabwe',BAN:'Bangladesh'};
