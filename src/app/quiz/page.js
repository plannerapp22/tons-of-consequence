'use client';

/**
 * TONS OF CONSEQUENCE â The Pub Test
 * ====================================
 * 6 either/or questions that derive the user's weighting profile
 * and reveal their persona before dropping them into the rankings.
 *
 * Route: /quiz
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { encodeWeights } from '@/lib/scoring';

// âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
// QUESTIONS
// Each answer shifts lever weights by the delta values.
// Deltas are applied on top of DEFAULT_WEIGHTS.
// âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ

const QUESTIONS = [
  {
    id: 1,
    question: "A batter scores 200* in a dead rubber nobody watched. Another scores 104 that wins the Ashes on the final ball. Which is the greater innings?",
    a: {
      text: "The 200*. Runs are runs.",
      emoji: "ð",
      delta: { matchImpact: -8, conditions: +4, clutchness: -6, narrative: +4, historicalWeight: +3, perceivedGreatness: +3 },
    },
    b: {
      text: "The 104. Context is everything.",
      emoji: "ð¯",
      delta: { matchImpact: +8, conditions: -2, clutchness: +6, narrative: +2, historicalWeight: -4, perceivedGreatness: -5 },
    },
  },
  {
    id: 2,
    question: "Steve Smith scores 144 at Edgbaston â thirteen months after the sandpaper scandal, to a standing ovation. Or Ricky Ponting scores the same 144 in the same match, unremarkably. Same innings, different man. Does the story change the score?",
    a: {
      text: "Yes. The story is part of the innings.",
      emoji: "âï¸",
      delta: { matchImpact: -4, conditions: -2, clutchness: 0, narrative: +12, historicalWeight: +2, perceivedGreatness: +2 },
    },
    b: {
      text: "No. The scorebook doesn't care.",
      emoji: "ð",
      delta: { matchImpact: +4, conditions: +4, clutchness: +4, narrative: -12, historicalWeight: +0, perceivedGreatness: +2 },
    },
  },
  {
    id: 3,
    question: "Bradman scores 334 against a mediocre England attack on a flat MCG pitch. Or a lower-order batter scores 110 on a raging turner against a prime West Indies pace quartet in a must-win match. Whose innings matters more?",
    a: {
      text: "Bradman. The scale is incomparable.",
      emoji: "ðï¸",
      delta: { matchImpact: -2, conditions: -8, clutchness: -4, narrative: +4, historicalWeight: +8, perceivedGreatness: +6 },
    },
    b: {
      text: "The 110. That was genuinely harder.",
      emoji: "ð©ï¸",
      delta: { matchImpact: +4, conditions: +8, clutchness: +6, narrative: +2, historicalWeight: -8, perceivedGreatness: -6 },
    },
  },
  {
    id: 4,
    question: "Australia need 308 in the fourth innings. Last recognised batsman at the crease. The team around them collapses. They score 153* and win. Or: they score 153 in the first innings of a comfortable team victory. Same runs â different moment.",
    a: {
      text: "The chase. Pressure reveals everything.",
      emoji: "â¡",
      delta: { matchImpact: +6, conditions: +2, clutchness: +10, narrative: +2, historicalWeight: -4, perceivedGreatness: -2 },
    },
    b: {
      text: "First innings. Setting the foundation is underrated.",
      emoji: "ð§±",
      delta: { matchImpact: +4, conditions: +2, clutchness: -10, narrative: +4, historicalWeight: +2, perceivedGreatness: -2 },
    },
  },
  {
    id: 5,
    question: "Viv Richards scores 291 at The Oval weeks after Tony Greig says he'll make West Indies 'grovel'. It's political, furious, loaded with meaning. Or: a technically perfect 291 by a neutral player in a forgettable series. Same score.",
    a: {
      text: "Richards. The meaning matters.",
      emoji: "â",
      delta: { matchImpact: -2, conditions: 0, clutchness: 0, narrative: +14, historicalWeight: +4, perceivedGreatness: +4 },
    },
    b: {
      text: "The technically perfect one. Purity counts.",
      emoji: "ð",
      delta: { matchImpact: +4, conditions: +6, clutchness: +2, narrative: -14, historicalWeight: -4, perceivedGreatness: -4 },
    },
  },
  {
    id: 6,
    question: "Final question. Be honest with yourself. You're watching cricket with a mate and an innings finishes. What are you most likely to say?",
    a: {
      text: "\"That won them the game. That's what matters.\"",
      emoji: "ð",
      delta: { matchImpact: +8, conditions: +2, clutchness: +4, narrative: -6, historicalWeight: -4, perceivedGreatness: -4 },
    },
    b: {
      text: "\"Mate, do you know the story of how he got here?\"",
      emoji: "ðº",
      delta: { matchImpact: -6, conditions: -2, clutchness: -2, narrative: +10, historicalWeight: +4, perceivedGreatness: +4 },
    },
  },
];

// âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
// PERSONA DEFINITIONS
// Matched based on final weight distribution
// âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ

const PERSONAS = [
  {
    id: 'purist',
    name: 'The Purist',
    emoji: 'ð',
    tagline: 'What happened on the pitch â nothing else.',
    description: 'You don\'t care about the backstory, the politics, or who was watching. You want to know: how hard was it to score those runs, and what did they do to the match? The pitch doesn\'t lie.',
    colour: '#38bde8',
    match: w => w.conditions >= 22 && w.clutchness >= 20 && w.narrative <= 14,
  },
  {
    id: 'romantic',
    name: 'The Romantic',
    emoji: 'âï¸',
    tagline: 'Stories and tears over numbers.',
    description: 'Scorebooks are incomplete documents. The number on the board tells you nothing about the 13 months of recovery, the crowd holding its breath, or what it meant to the person holding the bat. You\'re here for all of it.',
    colour: '#d08840',
    match: w => w.narrative >= 28,
  },
  {
    id: 'analyst',
    name: 'The Analyst',
    emoji: 'ð',
    tagline: 'Context and difficulty above all.',
    description: 'The conditions, the bowling attack, the pitch â these are the variables that separate a great innings from a great score. You\'d rather see 104 against a prime West Indies attack than 380 against Zimbabwe. Degree of difficulty is everything.',
    colour: '#38bde8',
    match: w => w.matchImpact >= 30 && w.conditions >= 26,
  },
  {
    id: 'patriot',
    name: 'The Patriot ð¦ðº',
    emoji: 'ð¦',
    tagline: 'Australia first, everywhere else second.',
    description: 'You appreciate great cricket wherever it comes from. You\'re just more likely to notice when it\'s green and gold. Ashes matches earn extra weight. A win in the Caribbean earns extra weight. The baggy green earns extra weight.',
    colour: '#f5c800',
    match: w => w.historicalWeight >= 22,
  },
  {
    id: 'clutch',
    name: 'The Believer',
    emoji: 'â¡',
    tagline: 'Pressure is the only real test.',
    description: 'Hundreds scored in comfortable positions don\'t impress you. You want last-wicket stands, fourth-innings chases, must-win matches. The best innings are the ones where failure wasn\'t an option.',
    colour: '#e8382e',
    match: w => w.clutchness >= 26,
  },
  {
    id: 'default',
    name: 'The Balanced Observer',
    emoji: 'ð',
    tagline: 'You\'re open to a good argument from any direction.',
    description: 'You see value in all of it â the story, the context, the conditions, the moment. You don\'t want to overweight any single dimension. That makes you the most dangerous person to argue with at the pub.',
    colour: '#2dd65a',
    match: () => true, // fallback
  },
];

function getPersona(weights) {
  return PERSONAS.find(p => p.match(weights)) || PERSONAS[PERSONAS.length - 1];
}

// âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
// APPLY DELTAS TO BASE WEIGHTS
// âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ

const BASE_WEIGHTS = {
  matchImpact: 20, conditions: 15, clutchness: 20,
  narrative: 20, historicalWeight: 15, perceivedGreatness: 10,
};

function applyDeltas(answers) {
  const w = { ...BASE_WEIGHTS };
  answers.forEach(delta => {
    Object.keys(delta).forEach(k => {
      w[k] = Math.max(3, Math.min(50, (w[k] || 0) + delta[k]));
    });
  });
  return w;
}
// âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
// STYLES
// âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ

const C = {
  bg: '#0d0d14', card: '#14141f', inset: '#0a0a10',
  border: '#252535', mid: '#3a3a55',
  gold: '#f5c800', red: '#e8382e', green: '#2dd65a',
  white: '#f0f0f8', off: '#c0c0d0', dim: '#707088', faint: '#404058',
};

// âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
// COMPONENT
// âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ

export default function PubTestQuiz() {
  const router = useRouter();
  const [step,    setStep]    = useState(0); // 0 = intro, 1-6 = questions, 7 = reveal
  const [answers, setAnswers] = useState([]); // array of delta objects
  const [chosen,  setChosen]  = useState(null); // 'a' or 'b' during reveal animation
  const [persona, setPersona] = useState(null);
  const [weights, setWeights] = useState(null);

  const current = QUESTIONS[step - 1];
  const progress = step > 0 && step <= QUESTIONS.length ? (step - 1) / QUESTIONS.length : 0;

  function answer(choice) {
    if (chosen) return; // prevent double-tap
    const q = QUESTIONS[step - 1];
    const delta = choice === 'a' ? q.a.delta : q.b.delta;
    const newAnswers = [...answers, delta];
    setChosen(choice);

    setTimeout(() => {
      setAnswers(newAnswers);
      setChosen(null);

      if (step >= QUESTIONS.length) {
        // Final answer â compute persona
        const finalWeights = applyDeltas(newAnswers);
        const p = getPersona(finalWeights);
        setPersona(p);
        setWeights(finalWeights);
        setStep(QUESTIONS.length + 1); // reveal
      } else {
        setStep(s => s + 1);
      }
    }, 400);
  }

  function goToRankings() {
    const encoded = encodeWeights(weights);
    router.push(`/?w=${encoded}&from=quiz`);
  }

  // ââ INTRO âââââââââââââââââââââââââââââââââââââââââââââââââ
  if (step === 0) {
    return (
      <div style={{ background: C.bg, minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 28, fontFamily: 'system-ui, sans-serif' }}>
        <div style={{ maxWidth: 560, textAlign: 'center' }}>
          <div style={{ fontSize: 56, marginBottom: 16 }}>ð</div>
          <h1 style={{ color: C.white, fontSize: 38, fontWeight: 900, letterSpacing: -1, textTransform: 'uppercase', lineHeight: 1.1, margin: '0 0 12px' }}>
            THE PUB TEST
          </h1>
          <p style={{ color: C.gold, fontWeight: 700, fontSize: 16, margin: '0 0 24px', letterSpacing: 0.5 }}>
            What kind of cricket fan are you?
          </p>
          <p style={{ color: C.off, fontSize: 15, lineHeight: 1.8, margin: '0 0 36px' }}>
            Six questions. No right answers. At the end, your own personal ranking of every Test century ever scored â built around your values, not ours.
          </p>
          <button
            onClick={() => setStep(1)}
            style={{
              background: C.gold, border: 'none', color: '#000',
              padding: '14px 40px', borderRadius: 6, cursor: 'pointer',
              fontSize: 16, fontWeight: 900, letterSpacing: 1, textTransform: 'uppercase',
              display: 'block', width: '100%', marginBottom: 14,
            }}
          >
            START THE PUB TEST
          </button>
          <button
            onClick={() => router.push('/')}
            style={{
              background: 'transparent', border: `1px solid ${C.border}`,
              color: C.dim, padding: '10px 24px', borderRadius: 6,
              cursor: 'pointer', fontSize: 12, fontWeight: 700,
              width: '100%',
            }}
          >
            SKIP â TAKE ME STRAIGHT TO THE RANKINGS
          </button>
        </div>
      </div>
    );
  }

  // ââ PERSONA REVEAL ââââââââââââââââââââââââââââââââââââââââ
  if (step === QUESTIONS.length + 1 && persona) {
    return (
      <div style={{ background: C.bg, minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 28, fontFamily: 'system-ui, sans-serif' }}>
        <div style={{ maxWidth: 580, textAlign: 'center' }}>
          <div style={{ color: C.dim, fontSize: 11, letterSpacing: 3, fontWeight: 700, marginBottom: 20, textTransform: 'uppercase' }}>
            YOUR RESULT
          </div>
          <div style={{ fontSize: 64, marginBottom: 16 }}>{persona.emoji}</div>
          <h2 style={{ color: persona.colour, fontSize: 42, fontWeight: 900, letterSpacing: -1, margin: '0 0 8px', textTransform: 'uppercase', lineHeight: 1 }}>
            {persona.name}
          </h2>
          <p style={{ color: C.gold, fontWeight: 700, fontSize: 15, margin: '0 0 24px' }}>
            "{persona.tagline}"
          </p>
          <p style={{ color: C.off, fontSize: 14, lineHeight: 1.9, margin: '0 0 36px' }}>
            {persona.description}
          </p>

          {/* Weight breakdown */}
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 6, padding: 20, marginBottom: 32, textAlign: 'left' }}>
            <div style={{ color: C.dim, fontSize: 10, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 14 }}>
              Your Weighting Profile
            </div>
            {weights && [
              ['ð¯ Match Impact',           weights.matchImpact,       '#f5c800'],
              ['ð©ï¸ Conditions & Opposition', weights.conditions,         '#38bde8'],
              ['â¡ Clutchness',              weights.clutchness,         '#e8382e'],
              ['ð Narrative',              weights.narrative,          '#d08840'],
              ['ðï¸ Historical Weight',      weights.historicalWeight,   '#a06ee8'],
              ['â­ Perceived Greatness',    weights.perceivedGreatness, '#2dd65a'],
            ].map(([name, val, col]) => (
              <div key={name} style={{ marginBottom: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ color: C.off, fontSize: 12, fontWeight: 600 }}>{name}</span>
                  <span style={{ color: col, fontWeight: 900, fontSize: 14 }}>{val}%</span>
                </div>
                <div style={{ height: 5, background: C.inset, borderRadius: 2 }}>
                  <div style={{ height: '100%', width: `${val / 50 * 100}%`, background: col, borderRadius: 2, transition: 'width 0.6s ease' }} />
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={goToRankings}
            style={{
              background: C.gold, border: 'none', color: '#000',
              padding: '14px 40px', borderRadius: 6, cursor: 'pointer',
              fontSize: 16, fontWeight: 900, letterSpacing: 1, textTransform: 'uppercase',
              display: 'block', width: '100%', marginBottom: 14,
            }}
          >
            SEE YOUR RANKING â
          </button>
          <button
            onClick={() => { setStep(0); setAnswers([]); setChosen(null); }}
            style={{
              background: 'transparent', border: `1px solid ${C.border}`,
              color: C.dim, padding: '10px', borderRadius: 6,
              cursor: 'pointer', fontSize: 12, fontWeight: 700, width: '100%',
            }}
          >
            RETAKE THE TEST
          </button>
        </div>
      </div>
    );
  }

  // ââ QUESTION ââââââââââââââââââââââââââââââââââââââââââââââ
  return (
    <div style={{ background: C.bg, minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 28, fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ maxWidth: 620, width: '100%' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
          <div style={{ color: C.dim, fontSize: 11, fontWeight: 700, letterSpacing: 2 }}>
            THE PUB TEST
          </div>
          <div style={{ color: C.dim, fontSize: 11, fontWeight: 700 }}>
            {step} / {QUESTIONS.length}
          </div>
        </div>

        {/* Progress bar */}
        <div style={{ height: 3, background: C.border, borderRadius: 2, marginBottom: 40, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${progress * 100}%`, background: C.gold, borderRadius: 2, transition: 'width 0.4s ease' }} />
        </div>

        {/* Question */}
        <h2 style={{ color: C.white, fontSize: 22, fontWeight: 800, lineHeight: 1.5, margin: '0 0 36px', letterSpacing: -0.5 }}>
          {current.question}
        </h2>

        {/* Answer options */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {(['a', 'b']).map(choice => {
            const opt = current[choice];
            const isChosen = chosen === choice;
            const isOther  = chosen && chosen !== choice;
            return (
              <button
                key={choice}
                onClick={() => answer(choice)}
                disabled={!!chosen}
                style={{
                  background: isChosen ? C.gold : isOther ? C.inset : C.card,
                  border: `2px solid ${isChosen ? C.gold : isOther ? C.border : C.mid}`,
                  color: isChosen ? '#000' : isOther ? C.faint : C.white,
                  borderRadius: 8, padding: '20px 24px',
                  cursor: chosen ? 'default' : 'pointer',
                  textAlign: 'left', fontSize: 15,
                  fontFamily: 'system-ui, sans-serif',
                  fontWeight: isChosen ? 800 : 600,
                  lineHeight: 1.5,
                  transition: 'all 0.2s',
                  display: 'flex', alignItems: 'center', gap: 16,
                  opacity: isOther ? 0.4 : 1,
                  transform: isChosen ? 'scale(1.01)' : 'scale(1)',
                }}
              >
                <span style={{ fontSize: 24, flexShrink: 0 }}>{opt.emoji}</span>
                <span>{opt.text}</span>
              </button>
            );
          })}
        </div>

        {/* Skip link */}
        <div style={{ textAlign: 'center', marginTop: 32 }}>
          <button
            onClick={() => router.push('/')}
            style={{ background: 'transparent', border: 'none', color: C.faint, cursor: 'pointer', fontSize: 11, fontWeight: 600 }}
          >
            Skip quiz â go straight to rankings
          </button>
        </div>
      </div>
    </div>
  );
}
