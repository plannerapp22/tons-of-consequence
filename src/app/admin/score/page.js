'use client';

/**
 * TONS OF CONSEQUENCE â Editorial Scoring Tool
 * =============================================
 * Admin interface for reviewing and scoring innings.
 * Surfaces Wikipedia source material, auto-detects narrative signals,
 * proposes scores, and lets you write the story text.
 *
 * Route: /admin/score
 *
 * Keyboard shortcuts:
 *   S / Enter  â Save & next
 *   N          â Skip to next (no save)
 *   P          â Previous innings
 *   1â9        â Quick-set Narrative score (Ã10)
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase, mapDbToInnings } from '@/lib/supabase';

// âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
// NARRATIVE SIGNALS
// Each signal has a name, description, and point value (added to Narrative score)
// âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ

const NARRATIVE_SIGNALS = [
  { key: 'debut',       label: 'Debut',                 desc: 'Test debut, first Ashes, maiden century on major ground', pts: 18 },
  { key: 'farewell',    label: 'Farewell',               desc: 'Final innings, retirement match, last Test', pts: 16 },
  { key: 'comeback',    label: 'Comeback',               desc: 'Return after injury, scandal, loss of form, or selection exile', pts: 22 },
  { key: 'adversity',   label: 'Physical adversity',     desc: 'Playing through injury, illness, grief, or extreme physical hardship', pts: 20 },
  { key: 'political',   label: 'Political / cultural weight', desc: 'Innings carrying meaning beyond cricket â race, identity, nationhood', pts: 18 },
  { key: 'record',      label: 'Record-breaking',        desc: 'World record, national record, or significant milestone', pts: 14 },
  { key: 'rivalry',     label: 'Ashes / major rivalry',  desc: 'Ashes Test, or similarly loaded bilateral rivalry', pts: 10 },
  { key: 'decider',     label: 'Series decider',         desc: 'Must-win match, series on the line, final Test of a series', pts: 12 },
  { key: 'underdog',    label: 'Against the odds',       desc: 'Scored when team was in crisis, batting last, or hugely outmatched', pts: 14 },
  { key: 'personal',    label: 'Personal redemption',    desc: 'Overcoming a very public failure, criticism, or personal struggle', pts: 16 },
];

const GREATNESS_SIGNALS = [
  { key: 'expert_lists',  label: 'Appears in expert \'greatest ever\' lists', pts: 22 },
  { key: 'fan_polls',     label: 'Appears in fan polls or public votes',      pts: 14 },
  { key: 'frequently_cited', label: 'Frequently cited in retrospective analysis', pts: 16 },
  { key: 'broadcasters',  label: 'Referenced by commentators as a benchmark', pts: 12 },
  { key: 'generational',  label: 'Considered defining innings of an era',     pts: 20 },
];

function calcSignalScore(signals, signalDefs, base = 30) {
  const total = signalDefs
    .filter(s => signals[s.key])
    .reduce((acc, s) => acc + s.pts, 0);
  return Math.min(98, base + total);
}

// âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
// WIKIPEDIA ENRICHMENT
// âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ

async function fetchWikipedia(playerName) {
  try {
    const searchResp = await fetch(
      `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(playerName + ' cricketer')}&format=json&origin=*&srlimit=1`
    );
    const searchData = await searchResp.json();
    const results = searchData?.query?.search;
    if (!results?.length) return null;

    const title = results[0].title;
    const summaryResp = await fetch(
      `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`
    );
    const summary = await summaryResp.json();
    return {
      title,
      extract: summary.extract,
      url: summary.content_urls?.desktop?.page,
      thumbnail: summary.thumbnail?.source,
    };
  } catch {
    return null;
  }
}

// âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
// COLOURS
// âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ

const C = {
  bg:      '#0d0d14',
  card:    '#14141f',
  inset:   '#0a0a10',
  border:  '#252535',
  mid:     '#3a3a55',
  gold:    '#f5c800',
  red:     '#e8382e',
  green:   '#2dd65a',
  sky:     '#38bde8',
  white:   '#f0f0f8',
  off:     '#c0c0d0',
  dim:     '#707088',
  faint:   '#404058',
};

const label = {
  color: C.dim, fontSize: 10, fontWeight: 700,
  letterSpacing: 2, textTransform: 'uppercase',
  display: 'block', marginBottom: 6,
};

// âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
// SIGNAL CHECKLIST
// âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ

function SignalChecklist({ signals, setSignals, defs, title, proposedScore }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <span style={label}>{title}</span>
        <span style={{ color: C.gold, fontWeight: 900, fontSize: 18 }}>
          â {proposedScore}
        </span>
      </div>
      {defs.map(s => (
        <label key={s.key} style={{
          display: 'flex', alignItems: 'flex-start', gap: 10,
          marginBottom: 8, cursor: 'pointer',
        }}>
          <input
            type="checkbox"
            checked={!!signals[s.key]}
            onChange={e => setSignals(prev => ({ ...prev, [s.key]: e.target.checked }))}
            style={{ marginTop: 2, accentColor: C.gold, flexShrink: 0 }}
          />
          <div>
            <span style={{ color: C.off, fontSize: 12, fontWeight: 700 }}>{s.label}</span>
            <span style={{ color: C.faint, fontSize: 10, display: 'block', lineHeight: 1.4 }}>{s.desc}</span>
          </div>
          <span style={{ color: C.faint, fontSize: 11, marginLeft: 'auto', flexShrink: 0 }}>+{s.pts}</span>
        </label>
      ))}
    </div>
  );
}

// âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
// SCORE SLIDER
// âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ

function ScoreSlider({ label: lbl, value, onChange, color = C.gold }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        <span style={{ color: C.dim, fontSize: 11, fontWeight: 700, letterSpacing: 1 }}>{lbl}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <input
            type="number" min="0" max="100" value={value}
            onChange={e => onChange(Math.max(0, Math.min(100, parseInt(e.target.value) || 0)))}
            style={{
              width: 48, background: C.inset, border: `1px solid ${color}50`,
              color, fontWeight: 900, fontSize: 16, textAlign: 'center',
              borderRadius: 4, padding: '2px 4px', outline: 'none',
            }}
          />
          <span style={{ color: C.dim, fontSize: 11 }}>/100</span>
        </div>
      </div>
      <input
        type="range" min="0" max="100" value={value}
        onChange={e => onChange(+e.target.value)}
        style={{ width: '100%', accentColor: color, display: 'block' }}
      />
      <div style={{ height: 4, background: C.inset, borderRadius: 2, overflow: 'hidden', marginTop: 4 }}>
        <div style={{ height: '100%', width: `${value}%`, background: color, borderRadius: 2, transition: 'width 0.15s' }} />
      </div>
    </div>
  );
}

// âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
// MAIN EDITORIAL PAGE
// âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ

export default function EditorialScorePage() {
  const [queue,      setQueue]      = useState([]);
  const [queueIdx,   setQueueIdx]   = useState(0);
  const [loading,    setLoading]    = useState(true);
  const [saving,     setSaving]     = useState(false);
  const [saved,      setSaved]      = useState(false);
  const [wiki,       setWiki]       = useState(null);
  const [wikiLoading,setWikiLoading]= useState(false);

  // Scoring state
  const [narrative,    setNarrative]    = useState(50);
  const [greatness,    setGreatness]    = useState(50);
  const [matchImpact,  setMatchImpact]  = useState(50);
  const [conditions,   setConditions]   = useState(50);
  const [clutchness,   setClutchness]   = useState(50);
  const [historical,   setHistorical]   = useState(50);
  const [story,        setStory]        = useState('');
  const [tags,         setTags]         = useState('');
  const [narSignals,   setNarSignals]   = useState({});
  const [greatSignals, setGreatSignals] = useState({});

  const storyRef = useRef(null);

  // Derived proposed scores from signals
  const proposedNarrative  = calcSignalScore(narSignals,   NARRATIVE_SIGNALS,  30);
  const proposedGreatness  = calcSignalScore(greatSignals, GREATNESS_SIGNALS,  25);

  // ââ Load queue from Supabase âââââââââââââââââââââââââââââ
  useEffect(() => {
    async function loadQueue() {
      setLoading(true);
      // Load innings that are heuristic-only (not yet editorially reviewed)
      // Priority: highest runs first (most famous innings first)
      const { data, error } = await supabase
        .from('centuries')
        .select('*')
        .in('score_status', ['heuristic', 'pipeline'])
        .order('runs', { ascending: false })
        .limit(500);

      if (error) {
        console.error(error);
        setLoading(false);
        return;
      }
      setQueue(data || []);
      setLoading(false);
    }
    loadQueue();
  }, []);

  // ââ Load innings into form when queue index changes ââââââ
  const current = queue[queueIdx];

  useEffect(() => {
    if (!current) return;
    setNarrative(current.lever_narrative ?? 50);
    setGreatness(current.lever_greatness ?? 50);
    setMatchImpact(current.lever_match_impact ?? 50);
    setConditions(current.lever_conditions ?? 50);
    setClutchness(current.lever_clutchness ?? 50);
    setHistorical(current.lever_historical ?? 50);
    setStory(current.story ?? '');
    setTags((current.tags ?? []).join(', '));
    setNarSignals({});
    setGreatSignals({});
    setSaved(false);

    // Fetch Wikipedia for this player
    setWiki(null);
    setWikiLoading(true);
    fetchWikipedia(current.player).then(data => {
      setWiki(data);
      setWikiLoading(false);
    });
  }, [queueIdx, current?.id]);

  // ââ Auto-apply proposed signal scores âââââââââââââââââââ
  useEffect(() => {
    setNarrative(proposedNarrative);
  }, [proposedNarrative]);

  useEffect(() => {
    setGreatness(proposedGreatness);
  }, [proposedGreatness]);

  // ââ Save to Supabase âââââââââââââââââââââââââââââââââââââ
  async function saveAndNext() {
    if (!current) return;
    setSaving(true);
    const tagArray = tags.split(',').map(t => t.trim()).filter(Boolean);
    const { error } = await supabase
      .from('centuries')
      .update({
        lever_narrative:    narrative,
        lever_greatness:    greatness,
        lever_match_impact: matchImpact,
        lever_conditions:   conditions,
        lever_clutchness:   clutchness,
        lever_historical:   historical,
        story,
        tags:               tagArray,
        score_status:       'editorial',
      })
      .eq('id', current.id);

    setSaving(false);
    if (!error) {
      setSaved(true);
      // Mark as reviewed in local queue
      setQueue(q => q.map((item, i) =>
        i === queueIdx ? { ...item, score_status: 'editorial' } : item
      ));
      setTimeout(() => {
        setSaved(false);
        setQueueIdx(i => Math.min(i + 1, queue.length - 1));
      }, 600);
    }
  }

  // ââ Keyboard shortcuts âââââââââââââââââââââââââââââââââââ
  useEffect(() => {
    function onKey(e) {
      // Don't trigger shortcuts when typing in textarea
      if (e.target.tagName === 'TEXTAREA' || e.target.tagName === 'INPUT') return;
      if (e.key === 's' || e.key === 'Enter') saveAndNext();
      if (e.key === 'n') setQueueIdx(i => Math.min(i + 1, queue.length - 1));
      if (e.key === 'p') setQueueIdx(i => Math.max(i - 1, 0));
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [queue, queueIdx, narrative, greatness, matchImpact, conditions, clutchness, historical, story, tags]);

  // âââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
  // RENDER
  // âââââââââââââââââââââââââââââââââââââââââââââââââââââââââ

  if (loading) {
    return (
      <div style={{ background: C.bg, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.dim, fontFamily: 'system-ui, sans-serif' }}>
        Loading queue from Supabase...
      </div>
    );
  }

  if (!queue.length) {
    return (
      <div style={{ background: C.bg, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'system-ui, sans-serif' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ color: C.green, fontSize: 48, marginBottom: 16 }}>â</div>
          <div style={{ color: C.white, fontSize: 20, fontWeight: 900 }}>All innings reviewed!</div>
          <div style={{ color: C.dim, marginTop: 8 }}>Nothing left in the queue.</div>
        </div>
      </div>
    );
  }

  const remaining = queue.filter(i => i.score_status !== 'editorial').length;
  const progress  = queue.length - remaining;

  return (
    <div style={{ background: C.bg, minHeight: '100vh', color: C.white, fontFamily: 'system-ui, sans-serif' }}>

      {/* ââ Top bar ââ */}
      <div style={{ background: C.card, borderBottom: `3px solid ${C.red}`, padding: '10px 28px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ background: C.red, borderRadius: 4, padding: '4px 8px', fontSize: 18 }}>ð</div>
          <div>
            <span style={{ color: C.white, fontWeight: 900, fontSize: 16, textTransform: 'uppercase', letterSpacing: -0.5 }}>
              Editorial Scoring
            </span>
            <span style={{ color: C.dim, fontSize: 11, marginLeft: 12 }}>
              {progress} / {queue.length} reviewed Â· {remaining} remaining
            </span>
          </div>
        </div>

        {/* Progress bar */}
        <div style={{ flex: 1, margin: '0 32px', height: 6, background: C.inset, borderRadius: 3, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${progress / queue.length * 100}%`, background: C.green, borderRadius: 3, transition: 'width 0.3s' }} />
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => setQueueIdx(i => Math.max(i - 1, 0))} style={btnStyle} title="Previous (P)">â PREV</button>
          <button onClick={() => setQueueIdx(i => Math.min(i + 1, queue.length - 1))} style={btnStyle} title="Skip (N)">SKIP â</button>
          <button onClick={saveAndNext} disabled={saving} style={{ ...btnStyle, background: saved ? C.green : C.gold, color: '#000', fontWeight: 900 }} title="Save & Next (S)">
            {saving ? 'SAVING...' : saved ? 'â SAVED' : 'SAVE & NEXT (S)'}
          </button>
        </div>
      </div>

      {current && (
        <div style={{ maxWidth: 1400, margin: '0 auto', padding: '24px 28px', display: 'grid', gridTemplateColumns: '1fr 380px 300px', gap: 20, alignItems: 'start' }}>

          {/* ââ LEFT: Innings info + story editor ââ */}
          <div>
            {/* Innings header */}
            <div style={{ ...cardStyle, borderTop: `4px solid ${C.gold}`, marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ color: C.gold, fontSize: 32, fontWeight: 900, letterSpacing: -1, lineHeight: 1 }}>
                    {current.runs}{current.not_out ? '*' : ''}
                  </div>
                  <div style={{ color: C.white, fontSize: 22, fontWeight: 900, textTransform: 'uppercase', marginTop: 4 }}>
                    {current.player}
                  </div>
                  <div style={{ color: C.dim, fontSize: 13, marginTop: 4 }}>
                    vs {current.opponent} Â· {current.ground} Â· {current.year}
                  </div>
                  {current.series && (
                    <div style={{ color: C.faint, fontSize: 11, marginTop: 2, textTransform: 'uppercase', letterSpacing: 1 }}>
                      {current.series}
                    </div>
                  )}
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ color: C.mid, fontSize: 10, fontWeight: 700, letterSpacing: 1, marginBottom: 4 }}>QUEUE POSITION</div>
                  <div style={{ color: C.off, fontSize: 20, fontWeight: 900 }}>{queueIdx + 1} / {queue.length}</div>
                  <div style={{
                    marginTop: 8, padding: '3px 8px', borderRadius: 3, fontSize: 10, fontWeight: 700,
                    background: current.score_status === 'editorial' ? C.green + '30' : C.faint + '30',
                    color: current.score_status === 'editorial' ? C.green : C.dim,
                    border: `1px solid ${current.score_status === 'editorial' ? C.green + '50' : C.mid}`,
                  }}>
                    {current.score_status?.toUpperCase()}
                  </div>
                </div>
              </div>

              {/* Quick stats */}
              <div style={{ display: 'flex', gap: 20, marginTop: 16, paddingTop: 16, borderTop: `1px solid ${C.border}` }}>
                {[
                  ['Balls', current.balls ?? 'â'],
                  ['Minutes', current.minutes ?? 'â'],
                  ['Innings', current.innings_number ?? 'â'],
                  ['Result', current.match_result?.toUpperCase() ?? 'â'],
                ].map(([l, v]) => (
                  <div key={l}>
                    <div style={{ color: C.faint, fontSize: 9, fontWeight: 700, letterSpacing: 1 }}>{l}</div>
                    <div style={{ color: C.white, fontSize: 16, fontWeight: 900 }}>{v}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Story editor */}
            <div style={cardStyle}>
              <span style={label}>Story (2â4 sentences)</span>
              <p style={{ color: C.faint, fontSize: 11, lineHeight: 1.6, marginBottom: 10 }}>
                Write the human story of this innings. What was at stake, what made it remarkable, why it matters. This appears in the detail view. Aim for the kind of sentence you'd say to a mate at the pub.
              </p>
              <textarea
                ref={storyRef}
                value={story}
                onChange={e => setStory(e.target.value)}
                placeholder="e.g. 'Waugh's unbeaten 200 in Jamaica against Ambrose, Walsh and Bishop â the most feared pace attack in the world...'"
                style={{
                  width: '100%', minHeight: 120,
                  background: C.inset, border: `1px solid ${C.border}`,
                  color: C.white, padding: 12, borderRadius: 4,
                  fontSize: 13, lineHeight: 1.7, resize: 'vertical',
                  outline: 'none', fontFamily: 'system-ui, sans-serif',
                }}
              />
              <div style={{ color: C.faint, fontSize: 10, marginTop: 6 }}>
                {story.length} chars Â· {story.split(/\s+/).filter(Boolean).length} words
              </div>
            </div>

            {/* Tags */}
            <div style={{ ...cardStyle, marginTop: 14 }}>
              <span style={label}>Tags (comma-separated)</span>
              <input
                type="text"
                value={tags}
                onChange={e => setTags(e.target.value)}
                placeholder="e.g. Ashes, Comeback, Last pair, World Record"
                style={{
                  width: '100%', background: C.inset, border: `1px solid ${C.border}`,
                  color: C.white, padding: '8px 12px', borderRadius: 4,
                  fontSize: 12, outline: 'none',
                }}
              />
              <p style={{ color: C.faint, fontSize: 10, marginTop: 6, lineHeight: 1.5 }}>
                3â5 short tags. These appear on the ranking card. Be specific.
              </p>
            </div>

            {/* All six lever scores */}
            <div style={{ ...cardStyle, marginTop: 14 }}>
              <span style={label}>All Lever Scores</span>
              <ScoreSlider label="ð¯ Match Impact"             value={matchImpact}  onChange={setMatchImpact}  color="#f5c800" />
              <ScoreSlider label="ð©à¸ Conditions & Opposition" value={conditions}   onChange={setConditions}   color="#38bde8" />
              <ScoreSlider label="â¡ Clutchness"              value={clutchness}   onChange={setClutchness}   color="#e8382e" />
              <ScoreSlider label="ð Narrative"              value={narrative}    onChange={setNarrative}    color="#d08840" />
              <ScoreSlider label="ðï¸ Historical Weight"      value={historical}   onChange={setHistorical}   color="#a06ee8" />
              <ScoreSlider label="â­ Perceived Greatness"    value={greatness}    onChange={setGreatness}    color="#2dd65a" />
            </div>
          </div>

          {/* ââ MIDDLE: Signal checklists ââ */}
          <div>
            <div style={cardStyle}>
              <div style={{ marginBottom: 16 }}>
                <span style={{ color: C.white, fontWeight: 900, fontSize: 14, textTransform: 'uppercase', letterSpacing: -0.5 }}>
                  Narrative Signals
                </span>
                <p style={{ color: C.faint, fontSize: 11, lineHeight: 1.5, marginTop: 6 }}>
                  Tick every signal that applies. The Narrative score updates automatically. Override manually if needed.
                </p>
              </div>
              <SignalChecklist
                signals={narSignals}
                setSignals={setNarSignals}
                defs={NARRATIVE_SIGNALS}
                title="Narrative"
                proposedScore={proposedNarrative}
              />

              <div style={{ height: 1, background: C.border, margin: '20px 0' }} />

              <div style={{ marginBottom: 16 }}>
                <span style={{ color: C.white, fontWeight: 900, fontSize: 14, textTransform: 'uppercase', letterSpacing: -0.5 }}>
                  Perceived Greatness Signals
                </span>
                <p style={{ color: C.faint, fontSize: 11, lineHeight: 1.5, marginTop: 6 }}>
                  How does history remember this innings?
                </p>
              </div>
              <SignalChecklist
                signals={greatSignals}
                setSignals={setGreatSignals}
                defs={GREATNESS_SIGNALS}
                title="Perceived Greatness"
                proposedScore={proposedGreatness}
              />
            </div>

            {/* Keyboard shortcuts reference */}
            <div style={{ ...cardStyle, marginTop: 14, opacity: 0.6 }}>
              <span style={label}>Keyboard Shortcuts</span>
              {[['S / Enter', 'Save & next'], ['N', 'Skip (no save)'], ['P', 'Previous innings']].map(([k, v]) => (
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: `1px solid ${C.border}` }}>
                  <span style={{ color: C.gold, fontFamily: 'monospace', fontSize: 12, fontWeight: 700 }}>{k}</span>
                  <span style={{ color: C.dim, fontSize: 11 }}>{v}</span>
                </div>
              ))}
            </div>
          </div>

          {/* ââ RIGHT: Wikipedia source material ââ */}
          <div>
            <div style={{ ...cardStyle, position: 'sticky', top: 80 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <span style={label}>Source Material</span>
                {wiki?.url && (
                  <a href={wiki.url} target="_blank" rel="noopener noreferrer"
                    style={{ color: C.sky, fontSize: 10, fontWeight: 700, letterSpacing: 1 }}>
                    OPEN WIKI â
                  </a>
                )}
              </div>

              {wikiLoading && (
                <div style={{ color: C.faint, fontSize: 12, padding: '20px 0', textAlign: 'center' }}>
                  Fetching Wikipedia...
                </div>
              )}

              {!wikiLoading && !wiki && (
                <div style={{ color: C.faint, fontSize: 12, lineHeight: 1.6 }}>
                  No Wikipedia article found for {current?.player}.
                  <br /><br />
                  Search manually:{' '}
                  <a href={`https://en.wikipedia.org/wiki/Special:Search?search=${encodeURIComponent(current?.player)}`}
                    target="_blank" rel="noopener noreferrer"
                    style={{ color: C.sky }}>Wikipedia â</a>
                  {' Â· '}
                  <a href={`https://www.espncricinfo.com/search?search=${encodeURIComponent(current?.player)}`}
                    target="_blank" rel="noopener noreferrer"
                    style={{ color: C.sky }}>Cricinfo â</a>
                </div>
              )}

              {!wikiLoading && wiki && (
                <>
                  {wiki.thumbnail && (
                    <img src={wiki.thumbnail} alt={wiki.title}
                      style={{ width: '100%', borderRadius: 4, marginBottom: 12, objectFit: 'cover', maxHeight: 180 }} />
                  )}
                  <div style={{ color: C.white, fontWeight: 900, fontSize: 14, marginBottom: 8 }}>{wiki.title}</div>
                  <div style={{ color: C.off, fontSize: 12, lineHeight: 1.8, maxHeight: 400, overflowY: 'auto' }}>
                    {wiki.extract}
                  </div>
                  <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                    <a href={wiki.url} target="_blank" rel="noopener noreferrer" style={{ color: C.sky, fontSize: 10, fontWeight: 700 }}>WIKIPEDIA â</a>
                    <span style={{ color: C.faint }}>Â·</span>
                    <a href={`https://www.espncricinfo.com/search?search=${encodeURIComponent(current?.player)}`}
                      target="_blank" rel="noopener noreferrer"
                      style={{ color: C.sky, fontSize: 10, fontWeight: 700 }}>CRICINFO â</a>
                    <span style={{ color: C.faint }}>Â·</span>
                    <a href={`https://www.google.com/search?q=${encodeURIComponent(current?.player + ' ' + current?.runs + ' vs ' + current?.opponent + ' ' + current?.year)}`}
                      target="_blank" rel="noopener noreferrer"
                      style={{ color: C.sky, fontSize: 10, fontWeight: 700 }}>GOOGLE â</a>
                  </div>
                </>
              )}
            </div>
          </div>

        </div>
      )}
    </div>
  );
}

const cardStyle = {
  background: '#14141f',
  border: '1px solid #252535',
  borderRadius: 6,
  padding: 18,
};

const btnStyle = {
  background: 'transparent',
  border: '1px solid #252535',
  color: '#c0c0d0',
  padding: '6px 12px',
  borderRadius: 4,
  cursor: 'pointer',
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: 1,
  textTransform: 'uppercase',
};
