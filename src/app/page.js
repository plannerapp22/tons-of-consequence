'use client';

import { useState, useMemo, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  LEVERS, DEFAULT_WEIGHTS, PRESETS,
  calcToc, scoreColor, scoreTier,
  encodeWeights, decodeWeights,
  FLAGS, NATIONS,
} from '@/lib/scoring';
import { calcVolatility, volatilityTier, writeVerdict } from '@/lib/volatility';
import { SAMPLE_CENTURIES } from '@/data/sample';

function TonsApp() {
  const router       = useRouter();
  const searchParams = useSearchParams();

  const [weights,       setWeights]       = useState(() => decodeWeights(searchParams.get('w')));
  const [filterPlayer,  setFilterPlayer]  = useState(searchParams.get('player') || 'All');
  const [filterCountry, setFilterCountry] = useState(searchParams.get('country') || 'All');
  const [sortBy,        setSortBy]        = useState(searchParams.get('sort') || 'toc');
  const [viewMode,      setViewMode]      = useState('rankings');
  const [searchQuery,   setSearchQuery]   = useState('');
  const [selected,      setSelected]      = useState(null);
  const [compareList,   setCompareList]   = useState([]);
  const [compareMode,   setCompareMode]   = useState(false);
  const [copied,        setCopied]        = useState(false);
  const [downloading,   setDownloading]   = useState(false);

  const screenshotRef = useRef(null);
  const searchRef     = useRef(null);
  const centuries     = SAMPLE_CENTURIES;

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
    centuries
      .map(c => ({ ...c, toc: calcToc(c, weights), vol: calcVolatility(c) }))
      .sort((a, b) => b.vol.volatility - a.vol.volatility),
    [weights, centuries]
  );

  useEffect(() => {
    const params = new URLSearchParams();
    params.set('w', encodeWeights(weights));
    if (filterPlayer  !== 'All') params.set('player', filterPlayer);
    if (filterCountry !== 'All') params.set('country', filterCountry);
    if (sortBy !== 'toc') params.set('sort', sortBy);
    router.replace(`/?${params.toString()}`, { scroll: false });
  }, [weights, filterPlayer, filterCountry, sortBy]);

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

  async function downloadScreenshot() {
    setDownloading(true);
    try {
      const html2canvas = (await import('html2canvas')).default;
      const canvas = await html2canvas(screenshotRef.current, {
        backgroundColor: '#0d0d14', scale: 2, useCORS: true, logging: false,
      });
      const link = document.createElement('a');
      link.download = `tons-of-consequence-${Date.now()}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (e) { console.error(e); }
    setDownloading(false);
  }

  function downloadCSV() {
    const list = viewMode === 'divisive' ? divisive : ranked;
    const headers = ['Rank','Player','Country','Runs','Not Out','Opponent','Venue','Year','Result','ToC Score','Volatility'].join(',');
    const rows = list.map((c, i) =>
      [i+1,`"${c.player}"`,c.country,c.runs,c.notOut?'*':'',`"${c.opponent}"`,`"${c.venue}"`,c.year,c.matchResult,c.toc,c.vol?.volatility??''].join(',')
    );
    const blob = new Blob([[headers,...rows].join('\n')], { type:'text/csv' });
    const link = document.createElement('a');
    link.download = 'tons-of-consequence.csv';
    link.href = URL.createObjectURL(blob);
    link.click();
  }

  useEffect(() => {
    function onKey(e) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        searchRef.current?.focus();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // ââ DETAIL VIEW âââââââââââââââââââââââââââââââââââââââââââ
  if (selected) {
    const c       = { ...selected, toc: calcToc(selected, weights) };
    const totalW  = Object.values(weights).reduce((a,b) => a+b, 0);
    const vol     = calcVolatility(selected);
    const vt      = volatilityTier(vol.volatility);
    const cultural= c.culturalValidation;
    const delta   = cultural - c.toc;
    const aligned = Math.abs(delta) <= 8;
    const overrated=delta < -8;
    const cultCol = aligned ? '#2dd65a' : overrated ? '#e8382e' : '#f5c800';

    return (
      <div style={S.page}>
        <AppHeader onShare={copyShareLink} copied={copied} onQuiz={() => router.push('/quiz')} />
        <div style={S.container}>
          <button onClick={() => setSelected(null)} style={S.backBtn}>â BACK TO RANKINGS</button>
          <div style={S.detailGrid}>
            <div>
              <div style={{ ...S.card, borderTop:'4px solid #f5c800', marginBottom:14 }}>
                <div style={{ display:'flex', alignItems:'center', gap:14, marginBottom:14 }}>
                  <span style={{ fontSize:32 }}>{FLAGS[c.country]}</span>
                  <div>
                    <h2 style={{ color:'#f0f0f8', margin:'0 0 2px', fontSize:24, letterSpacing:-0.5, fontWeight:900, textTransform:'uppercase' }}>{c.player}</h2>
                    <span style={{ color:'#707088', fontSize:12, fontWeight:600 }}>{NATIONS[c.country]}</span>
                  </div>
                </div>
                <div style={{ display:'flex', alignItems:'baseline', gap:16, marginBottom:10 }}>
                  <span style={{ color:'#f5c800', fontSize:52, fontWeight:900, lineHeight:1, letterSpacing:-2 }}>{c.runs}{c.notOut?'*':''}</span>
                  <div>
                    <div style={{ color:'#c0c0d0', fontSize:15, fontWeight:600 }}>vs {c.opponent}</div>
                    <div style={{ color:'#707088', fontSize:12 }}>{c.venue} Â· {c.year}</div>
                  </div>
                </div>
                {c.series && <div style={{ color:'#404058', fontSize:11, marginBottom:10, letterSpacing:1, textTransform:'uppercase' }}>{c.series}</div>}
                <div>{(c.tags||[]).map(t => <Tag key={t} text={t} />)}</div>
              </div>

              {c.story && (
                <div style={{ ...S.card, borderLeft:'4px solid #f5c800', marginBottom:14 }}>
                  <p style={{ color:'#c0c0d0', lineHeight:1.9, margin:0, fontSize:14, fontStyle:'italic' }}>&ldquo;{c.story}&rdquo;</p>
                </div>
              )}

              <div style={{ ...S.card, marginBottom:14 }}>
                <div style={S.sectionLabel}>Lever Breakdown</div>
                {LEVERS.map(lev => {
                  const raw    = c.levers[lev.key] || 0;
                  const contrib= Math.round(raw * (weights[lev.key]||0) / Math.max(totalW,1) * 10) / 10;
                  return (
                    <div key={lev.key} style={{ marginBottom:18 }}>
                      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
                        <span style={{ fontSize:13, color:'#f0f0f8', fontWeight:700 }}>{lev.icon} {lev.name}</span>
                        <div style={{ display:'flex', gap:16, alignItems:'center' }}>
                          <span style={{ color:'#404058', fontSize:11 }}>RAW {raw}/100</span>
                          <span style={{ color:lev.color, fontWeight:900, fontSize:15 }}>+{contrib} pts</span>
                        </div>
                      </div>
                      <div style={{ height:10, background:'#0a0a10', borderRadius:3, overflow:'hidden', border:'1px solid #252535' }}>
                        <div style={{ height:'100%', width:`${raw}%`, background:lev.color, borderRadius:3, transition:'width 0.4s' }} />
                      </div>
                    </div>
                  );
                })}
              </div>

              <div style={{ ...S.card, borderLeft:`4px solid ${vt.color}`, marginBottom:14 }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
                  <div style={S.sectionLabel}>Divisiveness Score</div>
                  <div>
                    <span style={{ color:vt.color, fontWeight:900, fontSize:22 }}>{vol.volatility}</span>
                    <span style={{ color:vt.color, fontSize:9, fontWeight:700, letterSpacing:2, marginLeft:8 }}>{vt.label}</span>
                  </div>
                </div>
                <p style={{ color:'#707088', fontSize:11, lineHeight:1.6, margin:'0 0 14px' }}>{vt.desc}</p>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
                 {vol.scores.map(s => (
                    <div key={s.preset} style={{ background:'#0a0a10', border:'1px solid #252535', borderRadius:4, padding:'8px 12px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                      <span style={{ color:'#707088', fontSize:11 }}>{s.emoji} {s.preset}</span>
                      <span style={{ color:scoreColor(s.score), fontWeight:900, fontSize:14 }}>{s.score}</span>
                    </div>
                  ))}
                </div>
                <div style={{ marginTop:10, display:'flex', justifyContent:'space-between' }}>
                  <span style={{ color:'#404058', fontSize:10 }}>Lowest: {vol.worstFor.emoji} {vol.worstFor.preset} ({vol.min})</span>
                  <span style={{ color:'#404058', fontSize:10 }}>Highest: {vol.bestFor.emoji} {vol.bestFor.preset} ({vol.max})</span>
                </div>
              </div>

              <div style={{ ...S.card, borderLeft:`4px solid ${cultCol}` }}>
                <div style={S.sectionLabel}>Cultural Validation</div>
                <p style={{ color:'#707088', fontSize:11, lineHeight:1.6, margin:'0 0 14px' }}>
                  How the world perceived this innings â hedia volume, sentiment, longevity of discourse. Measured separately from the scoring framework.
                </p>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-end', marginBottom:12 }}>
                  <div>
                    <div style={{ color:'#707088', fontSize:10, fontWeight:700, letterSpacing:1, marginBottom:2 }}>CULTURAL SCORE</div>
                    <div style={{ color:'#f0f0f8', fontSize:38, fontWeight:900, lineHeight:1 }}>{cultural}</div>
                  </div>
                  <div style={{ textAlign:'right' }}>
                    <div style={{ color:'s707088', fontSize:10, fontWeight:700, letterSpacing:1, marginBottom:2 }}>TOC SCORE</div>
                    <div style={{ color:scoreColor(c.toc), fontSize:38, fontWeight:900, lineHeight:1 }}>{c.toc}</div>
                  </div>
                </div>
                <div style={{ height:8, background:'#0a0a10', borderRadius:4, marginBottom:10, overflow:'hidden' }}>
                  <div style={{ height:'100%', width:`${cultural}%`, background:cultCol, borderRadius:4, transition:'width 0.4s' }} />
                </div>
                <div style={{ color:cultCol, fontSize:12, fontWeight:700 }}>
                  {aligned    && ''â Algorithm and cultural perception are in line.'}
                  {overrated  && `â¼ Culturally overrated by ${Math.abs(Math.round(delta))} points â the narrative may exceed the innings.`}
                  {!aligned && !overrated && `â² Underrated by ${Math.round(delta)} pts â history hasn't caught up yet.`}
                </div>
              </div>
            </div>

            <div>
              <ScoreDisplay score={c.toc} />
              <div style={{ height:14 }} />
              <div style={{ ...S.card, marginBottom:14 }}>
                <div style={S.sectionLabel}>Match Stats</div>
                {[['Runs',`${c.runs}${c.notOut?'*':''}`],['Balls',c.balls??'â'],['Minutes',c.minutes??'â'],['Result',c.matchResult?.toUpperCase()??'â']].map(([l,v]) => (
                  <div key={l} style={{ display:'flex', justifyContent:'space-between', padding:'8px 0', borderBottom:'1px solid #252535' }}>
                    <span style={{ color:'#707088', fontSize:11, fontWeight:600 }}>{l}</span>
                    <span style={{ color:'#f0f0f8', fontWeight:900, fontSize:13 }}>{v}</span>
                  </div>
                ))}
              </div>
              <div style={S.card}>
                <div style={S.sectionLabel}>Lever Scores</div>
                {LEVERS.map(lev => (
                  <div key={lev.key} style={{ display:'flex', alignItems:'center', gap:8, marginBottom:10 }}>
                    <span style={{ width:18, fontSize:12, flexShrink:0 }}>{lev.icon}</span>
                    <div style={{ flex:1, height:6, background:'#0a0a10', borderRadius:3, border:'1px solid #252535' }}>
                      <div style={{ height:'100%', width:`${c.levers[lev.key]||0}%`, background:lev.color, borderRadius:3 }} />
                    </div>
                    <span style={{ color:lev.color, fontSize:12, width:28, textAlign:'right', fontWeight:900 }}>{c.levers[lev.key]||0}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ââ COMPARE VIEW ââââââââââââââââââââââââââââââââââââââââââ
  if (compareMode && compareItems.length >= 2) {
    const verdict = writeVerdict(compareItems[0], compareItems[1], weights);
    return (
      <div style={S.page}>
        <AppHeader onShare={copyShareLink} copied={copied} onQuiz={() => router.push('/quiz')} />
        <div style={S.container}>
          <button onClick={() => setCompareMode(false)} style={S.backBtn}>â BACK</button>
          <h2 style={{ color:'#f0f0f8', fontWeight:900, fontSize:22, margin:'0 0 6px', textTransform:'uppercase', letterSpacing:-0.5 }}>Head to Head</h2>

          <div style={{ ...S.card, borderLeft:`4px solid ${scoreColor(verdict.tocA)}`, marginBottom:24, padding:'18px 20px' }}>
            <div style={{ color:'#707088', fontSize:10, fontWeight:700, letterSpacing:2, textTransform:'uppercase', marginBottom:10 }}>THE VERDICT â on your settings</div>
            <p style={{ color:'#f0f0f8', fontSize:15, lineHeight:1.8, margin:'0 0 12px', fontWeight:500 }}>{verdict.verdict}</p>
            <div style={{ display:'flex', gap:24, flexWrap:'wrap' }}>
              {compareItems.map(c => (
                <div key={c.id} style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <span style={{ fontSize:16 }}>{FLAGS[c.country]}</span>
                  <span style={{ color:'#c0c0d0', fontSize:12, fontWeight:700 }}>{c.player} {c.runs}{c.notOut?'*':''}</span>
                  <span style={{ color:scoreColor(c.toc), fontWeight:900, fontSize:16 }}>{c.toc}</span>
                </div>
              ))}
            </div>
          </div>

          <div style={{ display:'grid', gridTemplateColumns:`repeat(${compareItems.length}, 1fr)`, gap:16 }}>
            {compareItems.map(c => {
              const cv = calcVolatility(c);
              const cvt = volatilityTier(cv.volatility);
              return (
                <div key={c.id} style={{ ...S.card, borderTop:`4px solid ${scoreColor(c.toc)}` }}>
                  <div style={{ textAlign:'center', marginBottom:16 }}>
                    <div style={{ fontSize:28, marginBottom:4 }}>{FLAGS[c.country]}</div>
                    <div style={{ color:'#f0f0f8', fontWeight:900, fontSize:16, marginBottom:2, textTransform:'uppercase' }}>{c.player}</div>
                    <div style={{ color:'#f5c800', fontSize:34, fontWeight:900, lineHeight:1, letterSpacing:-1 }}>{c.runs}{c.notOut?'*':''}</div>
                    <div style={{ color:'#707088', fontSize:11, marginBottom:12 }}>vs {c.opponent} Â· {c.year}</div>
                    <ScoreDisplay score={c.toc} compact />
                    <div style={{ marginTop:8, display:'inline-block', padding:'3px 8px', borderRadius:3, background:cvt.color+'20', border:`1px solid ${cvt.color}40` }}>
                      <span style={{ color:cvt.color, fontSize:9, fontWeight:700, letterSpacing:1 }}>{cvt.label} Â· {cv.volatility}</span>
                    </div>
                  </div>
                  <div style={{ height:1, background:'#252535', margin:'14px 0' }} />
                  {LEVERS.map(lev => (
                    <div key={lev.key} style={{ marginBottom:10 }}>
                      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                        <span style={{ fontSize:11, color:'#c0c0d0', fontWeight:600 }}>{lev.icon} {lev.name}</span>
                        <span style={{ color:lev.color, fontSize:13, fontWeight:900 }}>{c.levers[lev.key]||0}</span>
                      </div>
                      <div style={{ height:5, background:'#0a0a10', borderRadius:2 }}>
                        <div style={{ height:'100%', width:`${c.levers[lev.key]||0}%`, background:lev.color, borderRadius:2 }} />
                      </div>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
          <div style={{ marginTop:20, textAlign:'center' }}>
            <button onClick={() => { setCompareList([]); setCompareMode(false); }} style={S.redBtn}>CLEAR & RETURN</button>
          </div>
        </div>
      </div>
    );
  }

  // ââ MAIN VIEW âââââââââââââââââââââââââââââââââââââââââââââ
  const totalWeight = Object.values(weights).reduce((a,b) => a+b, 0);
  const activeList  = viewMode === 'divisive' ? divisive : ranked;

  return (
    <div style={S.page}>
      <AppHeader onShare={copyShareLink} copied={copied} onQuiz={() => router.push('/quiz')} />

      {compareList.length > 0 && (
        <div style={S.compareStrip}>
          <span style={{ color:'#f0f0f8', fontSize:12, fontWeight:700, letterSpacing:1 }}>{compareList.length}/3 SELECTED</span>
          <div style={{ display:'flex', gap:8 }}>
            {compareList.length >= 2 && <button onClick={() => setCompareMode(true)} style={S.compareBtn}>COMPARE NOW</button>}
            <button onClick={() => setCompareList([])} style={S.clearBtn}>CLEAR</button>
          </div>
        </div>
      )}

      <div style={S.mainGrid}>
        <div>
          <div style={{ ...S.card, padding:20, marginBottom:16 }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6 }}>
              <div style={S.sideLabel}>â Your Weighting</div>
              <button onClick={() => setWeights(DEFAULT_WEIGHTS)} style={S.resetBtn}>RESET</button>
            </div>
            <WeightBar total={totalWeight} />
            <div style={{ height:1, background:'#252535', margin:'14px 0' }} />
            {LEVERS.map(lev => (
              <div key={lev.key} style={{ marginBottom:20 }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6 }}>
                  <span style={{ fontSize:12, color:'#f0f0f8', fontWeight:700 }}>{lev.icon} {lev.name}</span>
                  <div style={{ display:'flex', alignItems:'center', gap:4 }}>
                    <input type="number" min="0" max="100" step="1" value={weights[lev.key]}
                      onChange={e => setWeights(w => ({ ...w, [lev.key]: Math.max(0, Math.min(100, parseInt(e.target.value,10)||0)) }))}
                      style={{ ...S.numInput, color:lev.color, borderColor:`${lev.color}50`, caretColor:lev.color }}
                    />
                    <span style={{ color:'#707088', fontSize:12 }}>%</span>
                  </div>
                </div>
                <input type="range" min="0" max="60" value={weights[lev.key]}
                  onChange={e => setWeights(w => ({ ...w, [lev.key]: +e.target.value }))}
                  style={{ color:lev.color, display:'block', width:'100%', marginBottom:4 }}
                />
                <p style={{ color:'#404058', fontSize:10, lineHeight:1.5 }}>{lev.description}</p>
              </div>
            ))}
            <div style={{ height:1, background:'#252535', margin:'14px 0' }} />
            <div style={S.sideLabel}>Presets</div>
            <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
              {PRESETS.map(p => (
                <button key={p.label} onClick={() => setWeights(p.w)} style={S.presetBtn} title={p.description}>
                  {p.emoji} {p.label}
                </button>
              ))}
            </div>
          </div>

          <div style={{ ...S.card, padding:18, marginBottom:16 }}>
            <div style={S.sideLabel}>Filter & Sort</div>
            <label style={S.filterLabel}>Player</label>
            <select value={filterPlayer} onChange={e => setFilterPlayer(e.target.value)} style={S.select}>
              {players.map(p => <option key={p}>{p}</option>)}
            </select>
            <label style={S.filterLabel}>Country</label>
            <select value={filterCountry} onChange={e => setFilterCountry(e.target.value)} style={S.select}>
              {countries.map(c => <option key={c}>{c}</option>)}
            </select>
            <label style={S.filterLabel}>Sort By</label>
            <select value={sortBy} onChange={e => setSortBy(e.target.value)} style={{ ...S.select, marginBottom:0 }}>
              <option value="toc">ToC Score</option>
              <option value="runs">Runs Scored</option>
              <option value="year">Year (Recent First)</option>
            </select>
          </div>

          <div style={{ ...S.card, padding:16, marginBottom:16 }}>
            <div style={S.sideLabel}>Share & Export</div>
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              <button onClick={copyShareLink} style={S.shareBtn}>{copied ? 'â Link Copied!' : 'ð Copy Share Link'}</button>
              <button onClick={downloadScreenshot} style={S.exportBtn} disabled={downloading}>{downloading ? 'Generating...' : 'ð· Screenshot Rankings'}</button>
              <button onClick={downloadCSV} style={S.exportBtn}>ð¥ Download CSV</button>
            </div>
            <p style={{ color:'#404058', fontSize:10, lineHeight:1.6, marginTop:10 }}>Share link encodes your exact weighting.</p>
          </div>

          <p style={{ color:'#404058', fontSize:10, lineHeight:1.7, padding:'0 4px' }}>
            PROTOTYPE Â· {centuries.length} curated centuries. Full version covers all ~4,000 Test centuries.
          </p>
        </div>

        <div>
          {/* Search */}
          <div style={{ position:'relative', marginBottom:16 }}>
            <span style={{ position:'absolute', left:14, top:'50%', transform:'translateY(-50%)', color:'#404058', fontSize:16, pointerEvents:'none' }}>ð</span>
            <input ref={searchRef} type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search player, opponent, venue, year, tag... (âK)"
              style={{ width:'100%', background:'#14141f', border:`1px solid ${searchQuery?'#3a3a55':'#252535'}`, color:'#f0f0f8', padding:'11px 14px 11px 42px', borderRadius:6, fontSize:13, outline:'none', transition:'border-color 0.15s' }}
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')}
                style={{ position:'absolute', right:12, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', color:'#707088', cursor:'pointer', fontSize:16, lineHeight:1 }}>Ã</button>
            )}
          </div>

          {/* View tabs */}
          <div style={{ display:'flex', gap:0, marginBottom:16, background:'#14141f', borderRadius:6, border:'1px solid #252535', padding:4 }}>
            {[{id:'rankings',label:'ð Rankings'},{id:'divisive',label:'ð¥ Most Divisive'}].map(tab => (
              <button key={tab.id} onClick={() => setViewMode(tab.id)} style={{
                flex:1, padding:'8px 12px', borderRadius:4, border:'none',
                background: viewMode===tab.id ? '#252535' : 'transparent',
                color: viewMode===tab.id ? '#f0f0f8' : '#707088',
                fontWeight: viewMode===tab.id ? 800 : 600,
                fontSize:12, cursor:'pointer', letterSpacing:0.5, transition:'all 0.15s',
              }}>{tab.label}</button>
            ))}
          </div>

          {viewMode === 'divisive' && (
            <div style={{ ...S.card, padding:'12px 16px', marginBottom:14, borderLeft:'4px solid #e8382e' }}>
              <p style={{ color:'#707088', fontSize:12, lineHeight:1.6, margin:0 }}>
                <strong style={{ color:'#f0f0f8' }}>Most Divisive</strong> â innings where your values change everything. High divisiveness means this century ranks wildly differently depending on what you weight. These are the pub arguments waiting to happen.
              </p>
            </div>
          )}

          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14, paddingBottom:12, borderBottom:'2px solid #252535' }}>
            <div>
              <span style={{ color:'#f0f0f8', fontWeight:900, fontSize:18, textTransform:'uppercase', letterSpacing:-0.5 }}>
                {viewMode === 'divisive' ? 'Most Divisive' : 'Rankings'}
              </span>
              {searchQuery && ranked.length === 0 && (
                <span style={{ color:'#707088', fontSize:12, marginLeft:8 }}>No results for &ldquo;{searchQuery}&rdquo;</span>
              )}
              {searchQuery && ranked.length > 0 && (
                <span style={{ color:'#707088', fontSize:12, marginLeft:8 }}>{ranked.length} result{ranked.length!==1?'s':''}</span>
              )}
            </div>
            <span style={{ color:'#404058', fontSize:10, fontWeight:600, letterSpacing:1 }}>CLICK FOR DETAIL Â· TICK TO COMPARE</span>
          </div>

          {viewMode === 'rankings' && ranked.length === 0 && (
            <div style={{ ...S.card, padding:32, textAlign:'center' }}>
              <div style={{ fontSize:32, marginBottom:12 }}>ð</div>
              <div style={{ color:'#f0f0f8', fontWeight:700, marginBottom:6 }}>No innings found</div>
              <div style={{ color:'#707088', fontSize:12 }}>Try a different search or clear your filters.</div>
              <button onClick={() => setSearchQuery('')} style={{ ...S.resetBtn, marginTop:12 }}>CLEAR SEARCH</button>
            </div>
          )}

          <div ref={screenshotRef}>
            {activeList.map((c, i) => {
              const isCompared = compareList.includes(c.id);
              const medalColor = viewMode!=='divisive' && (i===0?'#f5c800':i===1?'#aaaaaa':i===2?'#d08840':null);
              const vol  = viewMode==='divisive' ? c.vol : calcVolatility(c);
              const vt   = volatilityTier(vol.volatility);
              return (
                <div key={c.id} onClick={() => setSelected(c)} style={{
                  ...S.rankRow,
                  background:  isCompared ? '#1a1a2b' : '#14141f',
                  borderLeft:  viewMode==='divisive' ? `4px solid ${vt.color}` : medalColor ? `4px solid ${medalColor}` : '1px solid #252535',
                  borderColor: isCompared ? '#a88800' : undefined,
                  paddingLeft: (viewMode!=='divisive' && !medalColor) ? 16 : 12,
                }}>
                  {viewMode === 'divisive' ? (
                    <div style={{ width:42, flexShrink:0, textAlign:'center' }}>
                      <div style={{ color:vt.color, fontWeight:900, fontSize:18, lineHeight:1 }}>{vol.volatility}</div>
                      <div style={{ color:vt.color, fontSize:7, fontWeight:700, letterSpacing:1, opacity:0.7 }}>DIV</div>
                    </div>
                  ) : (
                    <div style={{ width:36, height:36, flexShrink:0, borderRadius:'50%', background:medalColor||'#252535', display:'flex', alignItems:'center', justifyContent:'center', color:medalColor?'#000':'#c0c0d0', fontWeight:900, fontSize:i<3?15:13 }}>{i+1}</div>
                  )}

                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4, flexWrap:'wrap' }}>
                      <span style={{ fontSize:18 }}>{FLAGS[c.country]}</span>
                      <span style={{ color:'#f0f0f8', fontWeight:800, fontSize:15, textTransform:'uppercase', letterSpacing:-0.3 }}>{c.player}</span>
                      <span style={{ color:'#f5c800', fontWeight:900, fontSize:18, letterSpacing:-0.5 }}>{c.runs}{c.notOut?'*':''}</span>
                      {(c.tags||[]).slice(0,2).map(t => <Tag key={t} text={t} />)}
                    </div>
                    <div style={{ color:'#707088', fontSize:11 }}>
                      vs {c.opponent} Â· {(c.venue||'').split(',')[0]} Â· {c.year} Â·{' '}
                      <span style={{ color:c.matchResult==='win'?'#2dd65a':c.matchResult==='draw'?'#f5c800':'#e8382e', fontWeight:700 }}>{(c.matchResult||'').toUpperCase()}</span>
                      {viewMode==='divisive' && <span style={{ marginLeft:8, color:vt.color, fontSize:10, fontWeight:700 }}>Â· {vt.label}</span>}
                    </div>
                  </div>

                  <div style={{ display:'flex', gap:3, alignItems:'flex-end', height:30, flexShrink:0 }}>
                    {LEVERS.map(lev => (
                      <div key={lev.key} style={{ width:7, height:30, background:'#0a0a10', borderRadius:2, border:'1px solid #252535', display:'flex', alignItems:'flex-end', overflow:'hidden' }}>
                        <div style={{ width:'100%', height:`${c.levers[lev.key]||0}%`, background:lev.color }} />
                      </div>
                    ))}
                  </div>

                  <div style={{ textAlign:'right', flexShrink:0, minWidth:56 }}>
                    <div style={{ color:scoreColor(c.toc), fontSize:26, fontWeight:900, lineHeight:1, letterSpacing:-1 }}>{c.toc}</div>
                    <div style={{ color:'#404058', fontSize:8, letterSpacing:2, fontWeight:700 }}>TOC</div>
                  </div>

                  <div onClick={e => { e.stopPropagation(); toggleCompare(c.id); }} style={{ width:22, height:22, flexShrink:0, border:`2px solid ${isCompared?'#f5c800':'#252535'}`, background:isCompared?'#f5c800':'transparent', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', color:'#000', fontSize:12, borderRadius:4, fontWeight:900 }}>
                    {isCompared ? 'â' : ''}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function AppHeader({ onShare, copied, onQuiz }) {
  return (
    <div style={{ background:'#14141f', borderBottom:'3px solid #e8382e', padding:'0 28px', position:'sticky', top:0, zIndex:100 }}>
      <div style={{ maxWidth:1200, margin:'0 auto' }}>
        <div style={{ borderBottom:'1px solid #252535', padding:'6px 0', display:'flex', alignItems:'center', gap:16 }}>
          <span style={{ color:'#e8382e', fontSize:9, fontWeight:800, letterSpacing:3, textTransform:'uppercase' }}>â TEST CRICKET</span>
          <span style={{ color:'#404058', fontSize:9 }}>|</span>
          <span style={{ color:'#404058', fontSize:9, letterSpacing:1 }}>NOT ALL HUNDREDS ARE CREATED EQUAL</span>
        </div>
        <div style={{ padding:'14px 0 12px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div style={{ display:'flex', alignItems:'center', gap:16 }}>
            <div style={{ background:'#e8382e', borderRadius:4, padding:'6px 10px', fontSize:22, lineHeight:1, flexShrink:0 }}>ð¿</div>
            <div>
              <h1 style={{ fontSize:26, fontWeight:900, color:'#f0f0f8', margin:'0 0 2px', letterSpacing:-1, lineHeight:1, textTransform:'uppercase' }}>
                TONS OF <span style={{ color:'#f5c800' }}>CONSEQUENCE</span>
              </h1>
              <p style={{ color:'#707088', margin:0, fontSize:11 }}>Scored by what it meant, not just what it made.</p>
            </div>
          </div>
          <div style={{ display:'flex', gap:8 }}>
            {onQuiz && (
              <button onClick={onQuiz} style={{ background:'#f5c800', border:'none', color:'#000', padding:'7px 14px', borderRadius:4, cursor:'pointer', fontSize:11, fontWeight:800, letterSpacing:1, textTransform:'uppercase' }}>
                ðº THE PUB TEST
              </button>
            )}
            <button onClick={onShare} style={{ background:copied?'#2dd65a':'transparent', border:`1px solid ${copied?'#2dd65a':'#252535'}`, color:copied?'#000':'#707088', padding:'7px 14px', borderRadius:4, cursor:'pointer', fontSize:11, fontWeight:700, letterSpacing:1, transition:'all 0.2s' }}>
              {copied ? 'â COPIED!' : 'ð SHARE'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function WeightBar({ total }) {
  const barColor = total===100?'#2dd65a':total>100?'#e8382e':'#f5c800';
  const status   = total===100?'â 100%':total>100?`+${total-100} over`:`${100-total} remaining`;
  return (
    <div style={{ marginBottom:16 }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
        <span style={{ color:'#707088', fontSize:10, fontWeight:700, letterSpacing:1, textTransform:'uppercase' }}>Total Weight</span>
        <div style={{ display:'flex', alignItems:'baseline', gap:8 }}>
          <span style={{ color:'#f0f0f8', fontWeight:900, fontSize:22, lineHeight:1 }}>{total}%</span>
          <span style={{ color:barColor, fontSize:11, fontWeight:700 }}>{status}</span>
        </div>
      </div>
      <div style={{ position:'relative', height:12, background:'#0a0a10', borderRadius:6, overflow:'hidden', border:'1px solid #252535' }}>
        <div style={{ height:'100%', width:`${Math.min(total/130*100,100)}%`, background:barColor, borderRadius:6, transition:'width 0.15s' }} />
        <div style={{ position:'absolute', left:`${100/130*100}%`, top:0, bottom:0, width:2, background:'rgba(240,240,248,0.15)' }} />
      </div>
      {total!==100 && <p style={{ color:'#404058', fontSize:10, margin:'4px 0 0' }}>Scores auto-normalise â ratios hold even if total â  100</p>}
    </div>
  );
}

function ScoreDisplay({ score, compact }) {
  const col = scoreColor(score);
  return (
    <div style={{ background:'#0a0a10', border:`2px solid ${col}30`, borderRadius:8, padding:compact?'12px 16px':'16px 24px', textAlign:'center' }}>
      <div style={{ color:col, fontSize:compact?42:64, fontWeight:900, lineHeight:1, letterSpacing:-2 }}>{score}</div>
      <div style={{ color:col, fontSize:9, letterSpacing:3, marginTop:4, fontWeight:700, opacity:0.7 }}>{scoreTier(score)}</div>
      <div style={{ color:'#707088', fontSize:8, letterSpacing:2, marginTop:2 }}>TOC SCORE</div>
    </div>
  );
}

function Tag({ text }) {
  return (
    <span style={{ display:'inline-block', background:'#0a0a10', border:'1px solid #252535', color:'#707088', borderRadius:2, padding:'2px 7px', fontSize:9, letterSpacing:1.5, marginRight:4, marginBottom:4, textTransform:'uppercase', fontWeight:600 }}>{text}</span>
  );
}

const S = {
  page:        { background:'#0d0d14', minHeight:'100vh', color:'#f0f0f8' },
  container:   { maxWidth:1200, margin:'0 auto', padding:'24px 28px' },
  mainGrid:    { maxWidth:1200, margin:'0 auto', padding:'22px 28px', display:'grid', gridTemplateColumns:'300px 1fr', gap:24 },
  detailGrid:  { display:'grid', gridTemplateColumns:'1fr 280px', gap:20, alignItems:'start' },
  card:        { background:'#14141f', border:'1px solid #252535', borderRadius:6, padding:18 },
  rankRow:     { padding:'12px 16px', marginBottom:8, display:'flex', alignItems:'center', gap:14, cursor:'pointer', borderRadius:6, border:'1px solid #252535', transition:'background 0.12s' },
  compareStrip:{ background:'#e8382e', padding:'8px 28px', display:'flex', justifyContent:'space-between', alignItems:'center' },
  backBtn:     { background:'transparent', border:'1px solid #252535', color:'#707088', cursor:'pointer', fontSize:11, marginBottom:20, padding:'5px 12px', letterSpacing:1, fontWeight:700, textTransform:'uppercase', borderRadius:4 },
  sideLabel:   { color:'#707088', fontSize:10, fontWeight:700, letterSpacing:2, textTransform:'uppercase', marginBottom:12 },
  sectionLabel:{ color:'#707088', fontSize:10, fontWeight:700, letterSpacing:2, textTransform:'uppercase', marginBottom:16 },
  filterLabel: { color:'#707088', fontSize:10, fontWeight:700, letterSpacing:1.5, textTransform:'uppercase', display:'block', marginBottom:5 },
  select:      { width:'100%', background:'#0a0a10', border:'1px solid #252535', color:'#c0c0d0', padding:'8px 10px', borderRadius:4, fontSize:12, marginBottom:10, outline:'none' },
  numInput:    { width:44, background:'#0a0a10', border:'1px solid', fontWeight:900, fontSize:15, textAlign:'center', borderRadius:4, padding:'2px 4px', outline:'none' },
  resetBtn:    { background:'transparent', border:'1px solid #252535', color:'#707088', padding:'4px 10px', borderRadius:4, cursor:'pointer', fontSize:10, fontWeight:700, letterSpacing:1, textTransform:'uppercase' },
  presetBtn:   { background:'#0a0a10', border:'1px solid #252535', color:'#c0c0d0', padding:'5px 10px', borderRadius:4, cursor:'pointer', fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:0.5 },
  shareBtn:    { background:'#1a1a2b', border:'1px solid #3a3a55', color:'#c0c0d0', padding:'8px 12px', borderRadius:4, cursor:'pointer', fontSize:11, fontWeight:700, textAlign:'left' },
  exportBtn:   { background:'transparent', border:'1px solid #252535', color:'#707088', padding:'8px 12px', borderRadius:4, cursor:'pointer', fontSize:11, fontWeight:600, textAlign:'left' },
  redBtn:      { background:'#e8382e', border:'none', color:'#f0f0f8', padding:'10px 24px', borderRadius:4, cursor:'pointer', fontSize:12, fontWeight:800, letterSpacing:1, textTransform:'uppercase' },
  compareBtn:  { background:'#f0f0f8', border:'none', color:'#e8382e', padding:'5px 14px', borderRadius:4, cursor:'pointer', fontSize:11, fontWeight:900, letterSpacing:1, textTransform:'uppercase' },
  clearBtn:    { background:'transparent', border:'1px solid rgba(240,240,248,0.3)', color:'#f0f0f8', padding:'5px 12px', borderRadius:4, cursor:'pointer', fontSize:11, fontWeight:700, letterSpacing:1 },
};

export default function Page() {
  return (
    <Suspense fallback={<div style={{ background:'#0d0d14', minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', color:'#707088', fontFamily:'system-ui,sans-serif' }}>Loading...</div>}>
      <TonsApp />
    </Suspense>
  );
}
