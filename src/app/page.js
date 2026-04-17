'use client';

import { useState, useMemo, useEffect, useRef, Suspense } from 'react';
import {
  LEVERS, calcToc, scoreColor, scoreTier, FLAGS, NATIONS,
} from '@/lib/scoring';
import { calcVolatility, volatilityTier, writeVerdict } from '@/lib/volatility';
import { SAMPLE_CENTURIES } from '@/data/sample';

// -- Weight mapping -------------------------------------------------------------
const WEIGHT_VALUES = [30, 22, 18, 14, 10, 6];

const CRITERIA = [
  { key: 'matchImpact',        name: 'Match Impact',           desc: 'Did it decide the course of the game?' },
  { key: 'clutchness',         name: 'Clutchness',             desc: 'The weight of pressure in the moment' },
  { key: 'narrative',          name: 'Narrative',              desc: 'The story surrounding the innings' },
  { key: 'conditions',         name: 'Conditions & Opposition',desc: 'What and who they were up against' },
  { key: 'historicalWeight',   name: 'Historical Weight',      desc: 'How time and experts have judged it' },
  { key: 'perceivedGreatness', name: 'Perceived Greatness',    desc: 'The consensus of those who watched' },
];

const DEFAULT_ORDER = ['matchImpact','clutchness','narrative','conditions','historicalWeight','perceivedGreatness'];

const PRESET_ORDERS = {
  'Default':      ['matchImpact','clutchness','narrative','conditions','historicalWeight','perceivedGreatness'],
  'The Purist':   ['matchImpact','conditions','clutchness','historicalWeight','narrative','perceivedGreatness'],
  'The Romantic': ['narrative','historicalWeight','clutchness','perceivedGreatness','matchImpact','conditions'],
  'The Analyst':  ['matchImpact','conditions','clutchness','narrative','historicalWeight','perceivedGreatness'],
  'The Patriot':  ['historicalWeight','clutchness','narrative','matchImpact','conditions','perceivedGreatness'],
};

function buildWeights(order) {
  return order.reduce((acc, key, i) => ({ ...acc, [key]: WEIGHT_VALUES[i] }), {});
}

function getActivePreset(order) {
  return Object.entries(PRESET_ORDERS).find(([, o]) => o.join() === order.join())?.[0] ?? null;
}

// -- Header Banner --------------------------------------------------------------
function HeaderBanner() {
  return (
    <svg viewBox="0 0 390 188" width="100%" xmlns="http://www.w3.org/2000/svg" style={{ display:'block' }}>
      <rect width="390" height="188" fill="#1C3828"/>
      <ellipse cx="195" cy="170" rx="170" ry="22" fill="none" stroke="#243E2A" strokeWidth="0.8"/>
      <rect x="184" y="153" width="22" height="28" fill="none" stroke="#243E2A" strokeWidth="0.6"/>
      <line x1="186" y1="153" x2="186" y2="145" stroke="#2A4A2A" strokeWidth="1" strokeLinecap="round"/>
      <line x1="190" y1="153" x2="190" y2="145" stroke="#2A4A2A" strokeWidth="1" strokeLinecap="round"/>
      <line x1="194" y1="153" x2="194" y2="145" stroke="#2A4A2A" strokeWidth="1" strokeLinecap="round"/>
      <line x1="197" y1="181" x2="197" y2="188" stroke="#2A4A2A" strokeWidth="1" strokeLinecap="round"/>
      <line x1="201" y1="181" x2="201" y2="188" stroke="#2A4A2A" strokeWidth="1" strokeLinecap="round"/>
      <line x1="205" y1="181" x2="205" y2="188" stroke="#2A4A2A" strokeWidth="1" strokeLinecap="round"/>
      <g fill="none" stroke="#2E5A2E" strokeWidth="1" strokeLinecap="round">
        <path d="M42,62 Q46,58 50,62"/><path d="M53,60 Q57,56 61,60"/>
        <path d="M105,54 Q109,50 113,54"/><path d="M300,66 Q304,62 308,66"/>
        <path d="M342,56 Q346,52 350,56"/>
      </g>
      <rect x="7" y="7" width="376" height="174" fill="none" stroke="#3A6A3A" strokeWidth="1.5"/>
      <rect x="11" y="11" width="368" height="166" fill="none" stroke="#2A5232" strokeWidth="0.5"/>
      <circle cx="22" cy="22" r="9.5" fill="#8B1C1C" stroke="#4A0808" strokeWidth="0.4"/>
      <path d="M14,20.5 C17.5,17.5 26.5,17.5 30,20.5" fill="none" stroke="#F0E6C8" strokeWidth="1" strokeLinecap="round" opacity="0.75"/>
      <path d="M14,23.5 C17.5,26.5 26.5,26.5 30,23.5" fill="none" stroke="#F0E6C8" strokeWidth="1" strokeLinecap="round" opacity="0.75"/>
      <circle cx="368" cy="22" r="9.5" fill="#8B1C1C" stroke="#4A0808" strokeWidth="0.4"/>
      <path d="M360,20.5 C363.5,17.5 372.5,17.5 376,20.5" fill="none" stroke="#F0E6C8" strokeWidth="1" strokeLinecap="round" opacity="0.75"/>
      <path d="M360,23.5 C363.5,26.5 372.5,26.5 376,23.5" fill="none" stroke="#F0E6C8" strokeWidth="1" strokeLinecap="round" opacity="0.75"/>
      <line x1="36" y1="36" x2="172" y2="36" stroke="#3A6A3A" strokeWidth="0.8"/>
      <circle cx="195" cy="36" r="3" fill="#C9533A"/>
      <line x1="218" y1="36" x2="354" y2="36" stroke="#3A6A3A" strokeWidth="0.8"/>
      <text x="195" y="55" textAnchor="middle" fill="#4A8A4A" fontSize="9" fontWeight="500" letterSpacing="4" fontFamily="sans-serif">* TEST CRICKET *</text>
      <text x="195" y="83" textAnchor="middle" fill="#F0E6C8" fontSize="25" fontWeight="500" letterSpacing="9" fontFamily="sans-serif">TONS OF</text>
      <text x="195" y="114" textAnchor="middle" fill="#F0E6C8" fontSize="33" fontWeight="500" letterSpacing="2" fontFamily="sans-serif">CONSEQUENCE</text>
      <line x1="36" y1="126" x2="178" y2="126" stroke="#3A6A3A" strokeWidth="0.8"/>
      <polygon points="195,122 200,126 195,130 190,126" fill="#C9533A"/>
      <line x1="212" y1="126" x2="354" y2="126" stroke="#3A6A3A" strokeWidth="0.8"/>
      <text x="195" y="142" textAnchor="middle" fill="#4A7A4A" fontSize="7.5" letterSpacing="1.5" fontFamily="sans-serif">THE DEFINITIVE RANKING OF TEST CRICKET CENTURIES</text>
    </svg>
  );
}

// -- Onboarding Screen ----------------------------------------------------------
function OnboardingScreen({ order, setOrder, onSubmit }) {
  const dragRef  = useRef({ active: false, fromIdx: -1 });
  const [draggingIdx, setDraggingIdx] = useState(-1);
  const listRef  = useRef(null);
  const activePreset = getActivePreset(order);

  function startDrag(e, position) {
    e.preventDefault();
    dragRef.current = { active: true, fromIdx: position };
    setDraggingIdx(position);

    function onMove(ev) {
      if (!dragRef.current.active || !listRef.current) return;
      const clientY = ev.touches ? ev.touches[0].clientY : ev.clientY;
      const rect = listRef.current.getBoundingClientRect();
      const relY  = clientY - rect.top;
      const cardH = rect.height / 6;
      const newIdx = Math.max(0, Math.min(5, Math.floor(relY / cardH)));
      if (newIdx !== dragRef.current.fromIdx) {
        setOrder(prev => {
          const next = [...prev];
          const [moved] = next.splice(dragRef.current.fromIdx, 1);
          next.splice(newIdx, 0, moved);
          return next;
        });
        dragRef.current.fromIdx = newIdx;
        setDraggingIdx(newIdx);
      }
    }

    function onUp() {
      dragRef.current.active = false;
      setDraggingIdx(-1);
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerup', onUp);
    }

    document.addEventListener('pointermove', onMove);
    document.addEventListener('pointerup', onUp);
  }

  return (
    <div style={{ background:'var(--bg-deep)', minHeight:'100vh' }}>
      <HeaderBanner />

      {/* Instruction */}
      <div style={{ padding:'20px 20px 16px', textAlign:'center', background:'var(--bg-subtle)', borderBottom:'0.5px solid var(--border-strong)' }}>
        <div style={{ fontSize:9, color:'var(--text-muted)', letterSpacing:'2.5px', marginBottom:10, textTransform:'uppercase' }}>
          SET YOUR WEIGHTINGS
        </div>
        <div style={{ fontSize:15, color:'var(--text-primary)', fontWeight:500, lineHeight:1.5, marginBottom:8 }}>
          What matters most in a great Test innings?
        </div>
        <div style={{ fontSize:11, color:'var(--text-muted)', lineHeight:1.7 }}>
          Drag to rank these six factors in order of importance.<br/>
          Your #1 choice carries 30% of the final score -- your #6 carries 6%.
        </div>
      </div>

      {/* Ranking list */}
      <div ref={listRef} style={{ padding:'12px 14px 4px' }}>
        {order.map((key, position) => {
          const c        = CRITERIA.find(x => x.key === key);
          const isTop    = position === 0;
          const isDragging = draggingIdx === position;
          const weight   = WEIGHT_VALUES[position];
          return (
            <div
              key={key}
              onPointerDown={e => startDrag(e, position)}
              style={{
                display:'flex', alignItems:'center', gap:10,
                padding:12, borderRadius:5, marginBottom:4,
                cursor: isDragging ? 'grabbing' : 'grab',
                touchAction:'none', userSelect:'none',
                background: isTop ? 'var(--bg-elevated)' : 'var(--bg-panel)',
                border: isTop ? '1px solid var(--border-highlight)' : '0.5px solid var(--border-default)',
                opacity: isDragging ? 0.45 : 1,
                transition: isDragging ? 'none' : 'opacity 0.15s',
              }}
            >
              {/* Drag handle */}
              <div style={{ display:'flex', flexDirection:'column', gap:3, flexShrink:0, width:12 }}>
                {[0,1,2].map(i => <span key={i} style={{ height:1.5, background:'var(--border-accent)', borderRadius:1, display:'block' }}/>)}
              </div>
              {/* Rank circle */}
              <div style={{
                width:26, height:26, borderRadius:'50%', flexShrink:0,
                display:'flex', alignItems:'center', justifyContent:'center',
                fontSize:11, fontWeight:500,
                background: isTop ? 'var(--rank-1-bg)' : 'var(--rank-n-bg)',
                border: isTop ? 'none' : '0.5px solid var(--border-highlight)',
                color: isTop ? '#F5EDD8' : 'var(--accent-green)',
              }}>{position + 1}</div>
              {/* Text */}
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:13, fontWeight:500, color:'var(--text-primary)' }}>{c.name}</div>
                <div style={{ fontSize:10, color:'var(--text-muted)', marginTop:2 }}>{c.desc}</div>
              </div>
              {/* Weight */}
              <div style={{ flexShrink:0, textAlign:'right' }}>
                <div style={{ fontSize:20, fontWeight:500, lineHeight:1, color: isTop ? 'var(--accent-red)' : 'var(--text-muted)' }}>
                  {weight}%
                </div>
                <div style={{ fontSize:9, color:'var(--text-dim)', letterSpacing:'1px', marginTop:2 }}>WEIGHT</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Preset strip */}
      <div style={{ padding:'8px 14px', borderTop:'0.5px solid var(--border-strong)', display:'flex', alignItems:'center', gap:6, overflowX:'auto' }}>
        <span style={{ fontSize:9, color:'var(--text-dim)', letterSpacing:'1.5px', whiteSpace:'nowrap', flexShrink:0 }}>PRESET</span>
        {Object.keys(PRESET_ORDERS).map(name => {
          const isActive = activePreset === name;
          return (
            <span key={name} onClick={() => setOrder([...PRESET_ORDERS[name]])}
              style={{
                fontSize:10, padding:'4px 10px', borderRadius:2, whiteSpace:'nowrap', flexShrink:0,
                letterSpacing:'0.5px', cursor:'pointer',
                border: isActive ? '0.5px solid #4A8A4A' : '0.5px solid var(--border-default)',
                color: isActive ? 'var(--accent-green)' : 'var(--text-dim)',
                background: isActive ? 'var(--bg-panel)' : 'transparent',
              }}
            >{name}</span>
          );
        })}
      </div>

      {/* CTA */}
      <div style={{ padding:'8px 14px 28px' }}>
        <button onClick={onSubmit} style={{
          width:'100%', background:'var(--accent-red)', border:'none',
          color:'#F5EDD8', fontSize:11, fontWeight:500, letterSpacing:'2px',
          padding:14, borderRadius:4, cursor:'pointer',
        }}>
          SEE MY RANKINGS ->
        </button>
      </div>
    </div>
  );
}

// -- Result Badge ---------------------------------------------------------------
function ResultBadge({ result }) {
  const r = (result || '').toLowerCase();
  const style = r === 'win'  ? { border:'0.5px solid #3A7A3A', color:'#7ACA7A' }
              : r === 'draw' ? { border:'0.5px solid #6A6030', color:'#BABA60' }
              :                { border:'0.5px solid #7A3030', color:'#CA7A7A' };
  return (
    <span style={{ fontSize:9, padding:'1px 5px', borderRadius:2, letterSpacing:'0.5px', ...style }}>
      {r.toUpperCase()}
    </span>
  );
}

// -- Tag Chip -------------------------------------------------------------------
function Tag({ text }) {
  return (
    <span style={{ fontSize:9, background:'rgba(255,255,255,0.07)', color:'#8AAA7A', padding:'2px 6px', borderRadius:2 }}>
      {text}
    </span>
  );
}

// -- Score Display (detail view) ------------------------------------------------
function ScoreDisplay({ score, compact }) {
  const col = scoreColor(score);
  return (
    <div style={{ background:'var(--bg-panel)', border:`1px solid ${col}30`, borderRadius:8, padding: compact ? '12px 16px' : '16px 24px', textAlign:'center' }}>
      <div style={{ color:col, fontSize: compact ? 42 : 56, fontWeight:500, lineHeight:1 }}>{score}</div>
      <div style={{ color:col, fontSize:9, letterSpacing:3, marginTop:4, fontWeight:500, opacity:0.7 }}>{scoreTier(score)}</div>
      <div style={{ color:'var(--text-muted)', fontSize:8, letterSpacing:2, marginTop:2 }}>TOC SCORE</div>
    </div>
  );
}

// -- Weighting Strip (results screen) ------------------------------------------
function WeightingStrip({ order, onChange }) {
  const colors = ['var(--text-primary)', '#8ABA8A', '#6A9A6A', '#5A8A5A', '#4A7A4A', '#3A6A3A'];
  return (
    <div style={{ padding:'8px 14px', background:'var(--bg-subtle)', borderBottom:'0.5px solid var(--border-strong)', display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
      <span style={{ fontSize:9, color:'var(--text-dim)', letterSpacing:'1.5px', flexShrink:0 }}>YOUR WEIGHTING:</span>
      {order.map((key, i) => {
        const c = CRITERIA.find(x => x.key === key);
        return (
          <span key={key} style={{ fontSize:10, color: colors[i] }}>
            {i + 1}. {c.name} ({WEIGHT_VALUES[i]}%){i < 5 && <span style={{ color:'var(--text-dim)', marginLeft:8 }}>.</span>}
          </span>
        );
      })}
      <div style={{ flex:1 }}/>
      <span onClick={onChange} style={{ fontSize:9, border:'0.5px solid var(--border-accent)', color:'var(--text-muted)', padding:'4px 10px', borderRadius:2, letterSpacing:'1px', cursor:'pointer', whiteSpace:'nowrap' }}>
        CHANGE ^
      </span>
    </div>
  );
}

// -- Rankings Card --------------------------------------------------------------
function RankCard({ c, rank, onClick, isCompared, onToggleCompare, viewMode }) {
  const vol = calcVolatility(c);
  const vt  = volatilityTier(vol.volatility);
  const isTop = rank === 1;
  const opacity = Math.max(0.5, 1 - (rank - 1) * 0.1);

  return (
    <div
      onClick={onClick}
      style={{
        display:'flex', alignItems:'center', gap:10,
        padding:'10px 12px', borderRadius:5, marginBottom:4,
        cursor:'pointer', opacity,
        background: isTop ? 'var(--bg-elevated)' : 'var(--bg-panel)',
        border: isTop ? '1px solid var(--border-highlight)' : `0.5px solid ${isCompared ? '#A88800' : 'var(--border-default)'}`,
      }}
    >
      {/* Rank circle / divisive score */}
      {viewMode === 'divisive' ? (
        <div style={{ width:36, flexShrink:0, textAlign:'center' }}>
          <div style={{ color:vt.color, fontWeight:500, fontSize:16, lineHeight:1 }}>{vol.volatility}</div>
          <div style={{ color:vt.color, fontSize:7, letterSpacing:1 }}>DIV</div>
        </div>
      ) : (
        <div style={{
          width:28, height:28, borderRadius:'50%', flexShrink:0,
          display:'flex', alignItems:'center', justifyContent:'center',
          fontSize:11, fontWeight:500,
          background: isTop ? 'var(--rank-1-bg)' : 'var(--rank-n-bg)',
          border: isTop ? 'none' : '0.5px solid var(--border-highlight)',
          color: isTop ? '#F5EDD8' : 'var(--accent-green)',
        }}>{rank}</div>
      )}

      {/* Main info */}
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ display:'flex', alignItems:'baseline', gap:6, flexWrap:'wrap', marginBottom:4 }}>
          <span style={{ fontSize:13, fontWeight:500, color:'var(--text-primary)', letterSpacing:'0.2px' }}>{c.player}</span>
          <span style={{ fontSize:12, color:'var(--accent-red)', fontWeight:500 }}>{c.runs}{c.notOut ? '*' : ''}</span>
          <ResultBadge result={c.matchResult} />
        </div>
        <div style={{ display:'flex', gap:3, flexWrap:'wrap' }}>
          {(c.tags || []).slice(0, 2).map(t => <Tag key={t} text={t} />)}
          <span style={{ fontSize:9, color:'var(--text-muted)' }}>vs {c.opponent} . {c.year}</span>
        </div>
      </div>

      {/* Bar charts */}
      <div style={{ display:'flex', gap:2, alignItems:'flex-end', height:24, flexShrink:0 }}>
        {LEVERS.map(lev => (
          <div key={lev.key} style={{ width:3, height:24, background:'var(--bg-deep)', borderRadius:1, overflow:'hidden', display:'flex', alignItems:'flex-end' }}>
            <div style={{ width:'100%', height:`${c.levers[lev.key]||0}%`, background: isTop ? 'var(--accent-red)' : 'var(--border-highlight)', borderRadius:1 }}/>
          </div>
        ))}
      </div>

      {/* TaC score */}
      <div style={{ flexShrink:0, textAlign:'right', minWidth:44 }}>
        <div style={{ fontSize: isTop ? 22 : 18, fontWeight:500, color: isTop ? '#F5EDD8' : 'var(--text-secondary)', lineHeight:1 }}>
          {c.toc}
        </div>
        <div style={{ fontSize:7, color:'var(--text-dim)', letterSpacing:2 }}>TOC</div>
      </div>

      {/* Compare tick */}
      <div
        onClick={e => { e.stopPropagation(); onToggleCompare(c.id); }}
        style={{ width:20, height:20, flexShrink:0, border:`1px solid ${isCompared ? '#A88800' : 'var(--border-strong)'}`, background: isCompared ? '#A88800' : 'transparent', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', borderRadius:3, fontSize:10, color:'#000', fontWeight:500 }}
      >
        {isCompared ? 'v' : ''}
      </div>
    </div>
  );
}

// -- Main App -------------------------------------------------------------------
function TonsApp() {
  const [screen,        setScreen]        = useState('onboard');  // 'onboard' | 'results'
  const [criteriaOrder, setCriteriaOrder] = useState([...DEFAULT_ORDER]);
  const [filterPlayer,  setFilterPlayer]  = useState('All');
  const [filterCountry, setFilterCountry] = useState('All');
  const [sortBy,        setSortBy]        = useState('toc');
  const [viewMode,      setViewMode]      = useState('rankings');
  const [searchQuery,   setSearchQuery]   = useState('');
  const [selected,      setSelected]      = useState(null);
  const [compareList,   setCompareList]   = useState([]);
  const [compareMode,   setCompareMode]   = useState(false);
  const [copied,        setCopied]        = useState(false);
  const searchRef = useRef(null);
  const centuries = SAMPLE_CENTURIES;

  const weights = useMemo(() => buildWeights(criteriaOrder), [criteriaOrder]);

  const players   = useMemo(() => ['All', ...[...new Set(centuries.map(c => c.player))].sort()], []);
  const countries = useMemo(() => ['All', ...[...new Set(centuries.map(c => c.country))].sort()], []);

  const ranked = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    let list = centuries
      .filter(c => filterPlayer  === 'All' || c.player  === filterPlayer)
      .filter(c => filterCountry === 'All' || c.country === filterCountry)
      .filter(c => {
        if (!q) return true;
        return (
          c.player.toLowerCase().includes(q) ||
          c.opponent.toLowerCase().includes(q) ||
          c.venue.toLowerCase().includes(q) ||
          String(c.year).includes(q) ||
          (c.series || '').toLowerCase().includes(q) ||
          (c.tags || []).some(t => t.toLowerCase().includes(q))
        );
      })
      .map(c => ({ ...c, toc: calcToc(c, weights) }));
    if (sortBy === 'toc')  list.sort((a, b) => b.toc - a.toc);
    if (sortBy === 'runs') list.sort((a, b) => b.runs - a.runs);
    if (sortBy === 'year') list.sort((a, b) => b.year - a.year);
    return list;
  }, [weights, filterPlayer, filterCountry, sortBy, searchQuery, centuries]);

  const divisive = useMemo(() =>
    centuries.map(c => ({ ...c, toc: calcToc(c, weights), vol: calcVolatility(c) }))
      .sort((a, b) => b.vol.volatility - a.vol.volatility),
    [weights, centuries]
  );

  function toggleCompare(id) {
    setCompareList(p => p.includes(id) ? p.filter(x => x !== id) : p.length < 3 ? [...p, id] : p);
  }

  const compareItems = useMemo(() =>
    compareList.map(id => centuries.find(c => c.id === id)).filter(Boolean)
      .map(c => ({ ...c, toc: calcToc(c, weights) })),
    [compareList, weights, centuries]
  );

  async function copyShareLink() {
    await navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function downloadCSV() {
    const list = viewMode === 'divisive' ? divisive : ranked;
    const headers = ['Rank','Player','Country','Runs','Not Out','Opponent','Venue','Year','Result','ToC Score'].join(',');
    const rows = list.map((c, i) =>
      [i+1,`"${c.player}"`,c.country,c.runs,c.notOut?'*':'',`"${c.opponent}"`,`"${c.venue}"`,c.year,c.matchResult,c.toc].join(',')
    );
    const blob = new Blob([[headers,...rows].join('\n')], { type:'text/csv' });
    const link = document.createElement('a');
    link.download = 'tons-of-consequence.csv';
    link.href = URL.createObjectURL(blob);
    link.click();
  }

  useEffect(() => {
    function onKey(e) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); searchRef.current?.focus(); }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // -- Onboarding --------------------------------------------------------------
  if (screen === 'onboard') {
    return (
      <OnboardingScreen
        order={criteriaOrder}
        setOrder={setCriteriaOrder}
        onSubmit={() => setScreen('results')}
      />
    );
  }

  // -- Detail View -------------------------------------------------------------
  if (selected) {
    const c      = { ...selected, toc: calcToc(selected, weights) };
    const totalW = Object.values(weights).reduce((a,b) => a+b, 0);
    const vol    = calcVolatility(selected);
    const vt     = volatilityTier(vol.volatility);
    return (
      <div style={{ background:'var(--bg-deep)', minHeight:'100vh', color:'var(--text-primary)' }}>
        <HeaderBanner />
        <WeightingStrip order={criteriaOrder} onChange={() => setScreen('onboard')} />
        <div style={{ maxWidth:860, margin:'0 auto', padding:'20px 14px' }}>
          <button onClick={() => setSelected(null)} style={{ background:'transparent', border:'0.5px solid var(--border-strong)', color:'var(--text-muted)', cursor:'pointer', fontSize:10, marginBottom:16, padding:'5px 12px', letterSpacing:'1px', fontWeight:500, textTransform:'uppercase', borderRadius:3 }}>
            <- BACK TO RANKINGS
          </button>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 260px', gap:16, alignItems:'start' }}>
            <div>
              <div style={{ background:'var(--bg-panel)', border:'0.5px solid var(--border-strong)', borderRadius:5, padding:16, marginBottom:12 }}>
                <div style={{ display:'flex', alignItems:'baseline', gap:10, marginBottom:10 }}>
                  <span style={{ fontSize:22, fontWeight:500, color:'var(--text-primary)' }}>{c.player}</span>
                  <span style={{ fontSize:18, color:'var(--accent-red)', fontWeight:500 }}>{c.runs}{c.notOut?'*':''}</span>
                  <ResultBadge result={c.matchResult} />
                </div>
                <div style={{ fontSize:11, color:'var(--text-muted)', marginBottom:10 }}>vs {c.opponent} . {c.venue} . {c.year}</div>
                <div style={{ display:'flex', gap:4, flexWrap:'wrap' }}>{(c.tags||[]).map(t => <Tag key={t} text={t} />)}</div>
              </div>

              {c.story && (
                <div style={{ background:'var(--bg-panel)', border:'0.5px solid var(--border-strong)', borderLeft:'3px solid var(--accent-red)', borderRadius:5, padding:16, marginBottom:12 }}>
                  <p style={{ color:'var(--text-secondary)', lineHeight:1.9, margin:0, fontSize:13, fontStyle:'italic' }}>&ldquo;{c.story}&rdquo;</p>
                </div>
              )}

              <div style={{ background:'var(--bg-panel)', border:'0.5px solid var(--border-strong)', borderRadius:5, padding:16, marginBottom:12 }}>
                <div style={{ fontSize:9, color:'var(--text-dim)', letterSpacing:'2px', textTransform:'uppercase', marginBottom:14 }}>Lever Breakdown</div>
                {LEVERS.map(lev => {
                  const raw    = c.levers[lev.key] || 0;
                  const contrib = Math.round(raw * (weights[lev.key]||0) / Math.max(totalW,1) * 10) / 10;
                  return (
                    <div key={lev.key} style={{ marginBottom:14 }}>
                      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:5 }}>
                        <span style={{ fontSize:12, color:'var(--text-primary)', fontWeight:500 }}>{lev.name}</span>
                        <span style={{ color:'var(--text-muted)', fontSize:11 }}>+{contrib} pts</span>
                      </div>
                      <div style={{ height:6, background:'var(--bg-deep)', borderRadius:3, overflow:'hidden' }}>
                        <div style={{ height:'100%', width:`${raw}%`, background: lev.color, borderRadius:3 }}/>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div style={{ background:'var(--bg-panel)', border:`0.5px solid ${vt.color}40`, borderLeft:`3px solid ${vt.color}`, borderRadius:5, padding:16 }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
                  <div style={{ fontSize:9, color:'var(--text-dim)', letterSpacing:'2px', textTransform:'uppercase' }}>Divisiveness</div>
                  <span style={{ color:vt.color, fontWeight:500, fontSize:20 }}>{vol.volatility}</span>
                </div>
                <p style={{ color:'var(--text-muted)', fontSize:11, lineHeight:1.6, margin:0 }}>{vt.desc}</p>
              </div>
            </div>

            <div>
              <ScoreDisplay score={c.toc} />
              <div style={{ height:12 }}/>
              <div style={{ background:'var(--bg-panel)', border:'0.5px solid var(--border-strong)', borderRadius:5, padding:14 }}>
                <div style={{ fontSize:9, color:'var(--text-dim)', letterSpacing:'2px', textTransform:'uppercase', marginBottom:12 }}>Match Stats</div>
                {[['Runs',`${c.runs}${c.notOut?'*':''}`],['Balls',c.balls??'--'],['Result',(c.matchResult||'').toUpperCase()]].map(([l,v]) => (
                  <div key={l} style={{ display:'flex', justifyContent:'space-between', padding:'7px 0', borderBottom:'0.5px solid var(--border-default)' }}>
                    <span style={{ color:'var(--text-muted)', fontSize:11 }}>{l}</span>
                    <span style={{ color:'var(--text-primary)', fontWeight:500, fontSize:12 }}>{v}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // -- Compare View ------------------------------------------------------------
  if (compareMode && compareItems.length >= 2) {
    const verdict = writeVerdict(compareItems[0], compareItems[1], weights);
    return (
      <div style={{ background:'var(--bg-deep)', minHeight:'100vh', color:'var(--text-primary)' }}>
        <HeaderBanner />
        <WeightingStrip order={criteriaOrder} onChange={() => setScreen('onboard')} />
        <div style={{ maxWidth:860, margin:'0 auto', padding:'20px 14px' }}>
          <button onClick={() => setCompareMode(false)} style={{ background:'transparent', border:'0.5px solid var(--border-strong)', color:'var(--text-muted)', cursor:'pointer', fontSize:10, marginBottom:16, padding:'5px 12px', letterSpacing:'1px', borderRadius:3 }}><- BACK</button>
          <div style={{ background:'var(--bg-panel)', border:'0.5px solid var(--border-strong)', borderRadius:5, padding:16, marginBottom:20 }}>
            <div style={{ fontSize:9, color:'var(--text-dim)', letterSpacing:'2px', textTransform:'uppercase', marginBottom:10 }}>THE VERDICT</div>
            <p style={{ color:'var(--text-primary)', fontSize:14, lineHeight:1.8, margin:'0 0 12px', fontWeight:500 }}>{verdict.verdict}</p>
            <div style={{ display:'flex', gap:20 }}>
              {compareItems.map(c => (
                <div key={c.id} style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <span style={{ color:'var(--text-primary)', fontSize:13, fontWeight:500 }}>{c.player} {c.runs}{c.notOut?'*':''}</span>
                  <span style={{ color:scoreColor(c.toc), fontWeight:500, fontSize:16 }}>{c.toc}</span>
                </div>
              ))}
            </div>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:`repeat(${compareItems.length},1fr)`, gap:12 }}>
            {compareItems.map(c => (
              <div key={c.id} style={{ background:'var(--bg-panel)', border:'0.5px solid var(--border-strong)', borderRadius:5, padding:14 }}>
                <div style={{ textAlign:'center', marginBottom:14 }}>
                  <div style={{ fontSize:22, fontWeight:500, color:'var(--text-primary)', marginBottom:4 }}>{c.player}</div>
                  <div style={{ color:'var(--accent-red)', fontSize:28, fontWeight:500, lineHeight:1 }}>{c.runs}{c.notOut?'*':''}</div>
                  <div style={{ color:'var(--text-muted)', fontSize:10, marginBottom:10 }}>vs {c.opponent} . {c.year}</div>
                  <ScoreDisplay score={c.toc} compact />
                </div>
                {LEVERS.map(lev => (
                  <div key={lev.key} style={{ marginBottom:8 }}>
                    <div style={{ display:'flex', justifyContent:'space-between', marginBottom:3 }}>
                      <span style={{ fontSize:10, color:'var(--text-secondary)' }}>{lev.name}</span>
                      <span style={{ color:lev.color, fontSize:11, fontWeight:500 }}>{c.levers[lev.key]||0}</span>
                    </div>
                    <div style={{ height:4, background:'var(--bg-deep)', borderRadius:2 }}>
                      <div style={{ height:'100%', width:`${c.levers[lev.key]||0}%`, background:lev.color, borderRadius:2 }}/>
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
          <div style={{ marginTop:16, textAlign:'center' }}>
            <button onClick={() => { setCompareList([]); setCo}pareMode(false); }} style={{ background:'var(--accent-red)', border:'none', color:'#F5EDD8', padding:'10px 24px', borderRadius:4, cursor:'pointer', fontSize:11, fontWeight:500, letterSpacing:'1.5px' }}>
              CLEAR & RETURN
            </button>
          </div>
        </div>
      </div>
    );
  }

  // -- Results Screen ----------------------------------------------------------
  const activeList = viewMode === 'divisive' ? divisive : ranked;

  return (
    <div style={{ background:'var(--bg-deep)', minHeight:'100vh', color:'var(--text-primary)' }}>
      <HeaderBanner />
      <WeightingStrip order={criteriaOrder} onChange={() => setScreen('onboard')} />

      {/* Compare strip */}
      {compareList.length > 0 && (
        <div style={{ background:'var(--accent-red)', padding:'8px 14px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <span style={{ color:'|F5EDD8', fontSize:11, fontWeight:500, letterSpacing:'1px' }}>{compareList.length}/3 SELECTED</span>
          <div style={{ display:'flex', gap:8 }}>
            {compareList.length >= 2 && (
              <button onClick={() => setCompareMode(true)} style={{ background:'#F5EDD8', border:'none', color:'var(--accent-red)', padding:'4px 12px', borderRadius:3, cursor:'pointer', fontSize:10, fontWeight:500, letterSpacing:'1px' }}>COMPARE NOW</button>
            )}
            <button onClick={() => setCompareList([])} style={{ background:'transparent', border:'0.5px solid rgba(245,237,216,0.4)', color:'#F5EDD8', padding:'4px 10px', borderRadius:3, cursor:'pointer', fontSize:10 }}>CLEAR</button>
          </div>
        </div>
      )}

      <div style={{ maxWidth:860, margin:'0 auto' }}>
        {/* Search */}
        <div style={{ background:'var(--bg-subtle)', border:'0.5px solid var(--border-strong)', borderRadius:4, padding:'8px 12px', display:'flex', alignItems:'center', gap:8, margin:'12px 14px' }}>
          <span style={{ color:'var(--text-dim)', fontSize:13 }}>o</span>
          <input
            ref={searchRef}
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search player, venue, year..."
            style={{ background:'transparent', border:'none', outline:'none', color:'var(--text-primary)', fontSize:12, letterSpacing:'0.3px', width:'100%' }}
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} style={{ background:'none', border:'none', color:'var(--text-muted)', cursor:'pointer', fontSize:16 }}>x</button>
          )}
        </div>

        {/* Tab bar */}
        <div style={{ display:'flex', borderBottom:'1px solid var(--border-strong)', margin:'0 14px 10px' }}>
          {[{id:'rankings',label:'RANKINGS'},{id:'divisive',label:'MOST DIVISIVE'}].map(tab => (
            <div key={tab.id} onClick={() => setViewMode(tab.id)} style={{
              padding:'6px 16px', fontSize:10, fontWeight:500, letterSpacing:'2px', cursor:'pointer',
              color: viewMode===tab.id ? 'var(--text-primary)' : 'var(--text-dim)',
              borderBottom: viewMode===tab.id ? '2px solid var(--accent-red)' : '2px solid transparent',
            }}>{tab.label}</div>
          ))}
        </div>

        {/* Filter row */}
        <div style={{ display:'flex', gap:8, padding:'0 14px 10px', alignItems:'center', flexWrap:'wrap' }}>
          <select value={filterPlayer} onChange={e => setFilterPlayer(e.target.value)} style={{ background:'var(--bg-subtle)', border:'0.5px solid var(--border-strong)', color:'#6A9A6A', fontSize:11, padding:'5px 24px 5px 8px', borderRadius:3 }}>
            {players.map(p => <option key={p}>{p}</option>)}
          </select>
          <select value={filterCountry} onChange={e => setFilterCountry(e.target.value)} style={{ background:'var(--bg-subtle)', border:'0.5px solid var(--border-strong)', color:'#6A9A6A', fontSize:11, padding:'5px 24px 5px 8px', borderRadius:3 }}>
            {countries.map(c => <option key={c}>{c}</option>)}
          </select>
          <select value={sortBy} onChange={e => setSortBy(e.target.value)} style={{ background:'var(--bg-subtle)', border:'0.5px solid var(--border-strong)', color:'#6A9A6A', fontSize:11, padding:'5px 24px 5px 8px', borderRadius:3 }}>
            <option value="toc">TaC Score</option>
            <option value="runs">Runs Scored</option>
            <option value="year">Year (Recent First)</option>
          </select>
          <div style={{ flex:1 }}/>
          <span onClick={copyShareLink} style={{ fontSize:9, color:'var(--text-dim)', letterSpacing:'1px', cursor:'pointer' }}>{copied ? 'v COPIED' : 'SHARE'}</span>
          <span onClick={downloadCSV} style={{ fontSize:9, color:'var(--text-dim)', letterSpacing:'1px', cursor:'pointer', marginLeft:8 }}>CSV</span>
        </div>

        {/* Results list */}
        <div style={{ padding:'0 14px 28px' }}>
          {viewMode === 'rankings' && ranked.length === 0 && (
            <div style={{ background:'var(--bg-panel)', border:'0.5px solid var(--border-strong)', borderRadius:5, padding:32, textAlign:'center' }}>
              <div style={{ color:'var(--text-primary)', fontWeight:500, marginBottom:6 }}>No innings found</div>
              <div style={{ color:'var(--text-muted)', fontSize:12 }}>Try a different search or clear your filters.</div>
            </div>
          )}
          {activeList.map((c, i) => (
            <RankCard
              key={c.id}
              c={c}
              rank={i + 1}
              viewMode={viewMode}
              isCompared={compareList.includes(c.id)}
              onClick={() => setSelected(c)}
              onToggleCompare={toggleCompare}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// -- Export ---------------------------------------------------------------------
export default function Page() {
  return (
    <Suspense fallback={
      <div style={{ background:'#162E20', minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', color:'|4A7A4A', fontFamily:'system-ui,sans-serif', fontSize:12, letterSpacing:'2px' }}>
        LOADING...
      </div>
    }>
      <TonsApp />
    </Suspense>
  );
}
