import {useEffect,useMemo,useRef,useState} from 'react';
import TemporalCanvas from './TemporalCanvas';
import TemporalNodeDetails from './TemporalNodeDetails';
import {prepareBundle,preparePositions,frameView,searchNodes,stateAt,currentRows,downloadCSV,yearRanges} from './temporalModel';
import {readTemporalJSON} from './temporalLoader';

function useReducedMotion(){
  const [reduced,setReduced]=useState(()=>window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  useEffect(()=>{const media=window.matchMedia('(prefers-reduced-motion: reduce)'),change=e=>setReduced(e.matches);media.addEventListener('change',change);return()=>media.removeEventListener('change',change);},[]);
  return reduced;
}
export default function EnterpriseTimeline({mode,registry,registryStatus,onRetryRegistry,focusId,setFocusId,onFocusMode}){
  const [model,setModel]=useState(null),[layout,setLayout]=useState(null),[status,setStatus]=useState('loading'),[message,setMessage]=useState(''),[retry,setRetry]=useState(0),[loadedKey,setLoadedKey]=useState('');
  const [year,setYear]=useState(2025),[rangeStart,setRangeStart]=useState(2003),[rangeEnd,setRangeEnd]=useState(2025),[playing,setPlaying]=useState(false),[speed,setSpeed]=useState(1),[theme,setTheme]=useState('dark'),[direction,setDirection]=useState('upstream');
  const [selectedId,setSelectedId]=useState(''),[query,setQuery]=useState(''),[focusQuery,setFocusQuery]=useState('');
  const chart=useRef(null),reducedMotion=useReducedMotion();
  useEffect(()=>{if(mode==='focus')setDirection('upstream');},[mode]);
  const companies=useMemo(()=>(registry?.focus_companies||[]).map(n=>({...n,id:String(n.id)})),[registry]);
  const focusIds=useMemo(()=>new Set(companies.map(n=>n.id)),[companies]);
  const company=companies.find(n=>n.id===focusId);
  const bundleFile=mode==='industry'?registry?.industry?.bundle_file:company?.bundle_file;
  const positionsFile=mode==='industry'?registry?.industry?.positions_file:company?.positions_file||registry?.focus_positions_file||registry?.focus_master_positions_file||registry?.focus?.positions_file;
  const datasetKey=`${bundleFile||''}|${positionsFile||''}`;
  useEffect(()=>{
    let active=true;setPlaying(false);setModel(null);setLayout(null);setLoadedKey('');setSelectedId('');setQuery('');setStatus('loading');setMessage('');
    if(!bundleFile||!positionsFile)return()=>{active=false};
    Promise.all([readTemporalJSON(bundleFile),readTemporalJSON(positionsFile)]).then(([bundle,positions])=>{
      if(!active)return;const m=prepareBundle(bundle),p=preparePositions(positions);
      const missing=[...m.nodes.keys()].filter(id=>!p.positions.has(id));
      if(missing.length)throw new Error(`Gephi固定坐标缺少${missing.length}家企业`);
      setModel(m);setLayout(p);setLoadedKey(datasetKey);setStatus('ready');setSelectedId(mode==='focus'&&m.nodes.has(focusId)?focusId:'');
      setYear(y=>m.years.includes(y)?y:m.years.at(-1));setRangeStart(y=>Math.max(m.years[0],Math.min(y,m.years.at(-1))));setRangeEnd(y=>Math.max(m.years[0],Math.min(y,m.years.at(-1))));
    }).catch(error=>{if(active){setStatus(error.preparing?'preparing':'error');setMessage(error.message);}});
    return()=>{active=false};
  },[bundleFile,positionsFile,retry]);
  const actualFocus=mode==='focus'?focusId:'';
  const view=useMemo(()=>model&&loadedKey===datasetKey?frameView(model,year,actualFocus,direction):null,[model,year,actualFocus,direction,loadedKey,datasetKey]);
  const rangeYears=useMemo(()=>model?.years.filter(y=>y>=rangeStart&&y<=rangeEnd)||[],[model,rangeStart,rangeEnd]);
  useEffect(()=>{
    if(!playing||!model)return;
    const timer=setInterval(()=>setYear(current=>rangeYears.find(y=>y>current)??current),1000/speed);
    return()=>clearInterval(timer);
  },[playing,speed,model,rangeYears]);
  useEffect(()=>{if(playing&&year>=rangeEnd)setPlaying(false);},[year,rangeEnd,playing]);
  const matches=useMemo(()=>model?searchNodes(model,query,year):[],[model,query,year]);
  const highlightIds=useMemo(()=>new Set(matches.map(n=>n.id)),[matches]);
  const listedCompanies=useMemo(()=>{const term=focusQuery.toLocaleLowerCase().trim();return companies.filter(n=>n.id===focusId||[n.id,n.label,...(n.search_names||[])].join(' ').toLocaleLowerCase().includes(term));},[companies,focusQuery,focusId]);
  const profileCoverage=view&&layout?view.nodeRows.filter(n=>layout.positions.has(n.id)).length:0;
  const partialYears=model?.raw.frames.filter(f=>f.source_frame_metadata?.early_years_partial).map(f=>Number(f.year))||[];
  const loading=registryStatus==='loading'||Boolean(registry&&bundleFile&&positionsFile&&status==='loading'),ready=Boolean(model&&layout&&view);
  function selectNode(id){setSelectedId(id);if(id)chart.current?.centerOn(id);}
  function changeYear(value){
    const target=Number(value);if(!model?.years.includes(target))return;
    setPlaying(false);setRangeStart(start=>Math.min(start,target));setRangeEnd(end=>Math.max(end,target));setYear(target);
  }
  function step(delta){if(!model)return;setPlaying(false);const index=rangeYears.indexOf(year),next=rangeYears[Math.max(0,Math.min(rangeYears.length-1,index+delta))];if(next!=null)setYear(next);}
  function play(){if(playing){setPlaying(false);return;}if(rangeYears.length<2)return;if(year>=rangeEnd||year<rangeStart)setYear(rangeYears[0]);setPlaying(true);}
  function changeStart(value){const y=Number(value);setPlaying(false);setRangeStart(y);if(y>rangeEnd)setRangeEnd(y);setYear(current=>Math.max(y,current));}
  function changeEnd(value){const y=Number(value);setPlaying(false);setRangeEnd(y);if(y<rangeStart)setRangeStart(y);setYear(current=>Math.min(y,current));}
  function download(kind){
    if(!ready)return;const stem=`${mode==='industry'?'行业年度网络':`企业${focusId}_${direction}`}_${year}`;
    if(kind==='png')chart.current?.downloadPNG(stem+'.png');

    else {const rows=currentRows(model,view,layout.positions);downloadCSV(stem+(kind==='nodes'?'_节点.csv':'_关系.csv'),rows[kind],kind==='nodes'?['network_kind','focus_id','direction','year','snapshot','id','label','home_region','status','comparison_year','first_observed_year','observed_years','x','y']:['network_kind','focus_id','direction','year','snapshot','id','source','target','source_label','target_label','weight','status','comparison_year']);}
  }
  const focusState=ready&&actualFocus?stateAt(model,focusId,year):null;
  return <section className="temporal-page" role="tabpanel" id={`enterprise-panel-${mode}`} aria-labelledby={`enterprise-tab-${mode}`}>
    <div className="temporal-heading"><div><h1>{mode==='industry'?'行业年度演变':'企业供方网络'}</h1><p>{ready?`${year}-12-31 · Gephi固定布局`:'2003—2025 · 年末网络'}</p></div><div className="temporal-downloads"><button disabled={!ready} onClick={()=>download('png')}>下载PNG</button><button disabled={!ready} onClick={()=>download('nodes')}>节点CSV</button><button disabled={!ready} onClick={()=>download('edges')}>关系CSV</button></div></div>
    <div className="temporal-controls">
      {mode==='focus'&&<label className="temporal-company-picker">焦点企业<input aria-label="搜索焦点企业" placeholder="名称或Revere ID" value={focusQuery} onChange={e=>setFocusQuery(e.target.value)}/><select aria-label="焦点企业" value={focusId} onChange={e=>setFocusId(e.target.value)} disabled={!companies.length}>{listedCompanies.map(n=><option value={n.id} key={n.id}>{n.label||n.id} · {n.id}</option>)}</select></label>}
      {mode==='focus'&&<fieldset className="temporal-directions"><legend>直接关系</legend>{[['upstream','上游供方'],['downstream','下游客户'],['both','双向']].map(([value,label])=><button key={value} className={direction===value?'active':''} aria-pressed={direction===value} onClick={()=>{setDirection(value);setSelectedId('');}}>{label}</button>)}</fieldset>}
      <div className="temporal-node-search"><label>查找图中企业<input aria-label="查找图中企业" placeholder="名称、历史名称或ID" value={query} disabled={!ready} onChange={e=>setQuery(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'&&matches[0])selectNode(matches[0].id);if(e.key==='Escape')setQuery('');}}/></label>{query&&ready&&<div className="temporal-search-results">{matches.length?matches.map(n=><button key={n.id} onClick={()=>{selectNode(n.id);setQuery('');}}><span>{stateAt(model,n.id,year).observed_year!=null?stateAt(model,n.id,year).label:n.label||n.id}</span><small>{view.nodeIds.has(n.id)?`${year}年`:'本期未见'} · {n.id}</small></button>):<p>没有匹配的企业</p>}</div>}</div>
      <div className="temporal-theme"><span>画布</span>{[['dark','深色'],['light','浅色']].map(([value,label])=><button key={value} className={theme===value?'active':''} aria-pressed={theme===value} onClick={()=>setTheme(value)}>{label}</button>)}</div>
    </div>
    <div className="temporal-body"><div className={`temporal-network ${theme==='dark'?'is-dark':''}`}>{ready?<><TemporalCanvas ref={chart} {...{model,view,theme,selectedId,highlightIds,reducedMotion}} positions={layout.positions} onSelect={setSelectedId} duration={Math.min(700,750/speed)}/>{view.counts.nodes===0&&<div className="temporal-empty-network">本期未见网络记录</div>}<div className="temporal-zoom"><button aria-label="放大时序网络" onClick={()=>chart.current?.zoomBy(1.3)}>＋</button><button aria-label="缩小时序网络" onClick={()=>chart.current?.zoomBy(1/1.3)}>−</button><button onClick={()=>chart.current?.fit()}>复位</button></div><div className="temporal-legend"><span><i className="new"/>新出现</span><span><i className="continuous"/>连续出现</span><span><i className="absent"/>本期未见</span></div>{mode==='focus'&&<div className="temporal-focus-name">{focusState?.observed_year===year?focusState.label:(company?.label||focusId)+' · 检索名'}</div>}</>:<div className="temporal-loading"><span>{loading?'正在读取年度网络…':status==='error'?`年度数据读取失败：${message}`:'时序数据正在准备'}</span>{!loading&&<button onClick={()=>{onRetryRegistry();setRetry(n=>n+1)}}>重新读取</button>}</div>}</div>{ready&&<TemporalNodeDetails {...{model,view,selectedId}} setYear={changeYear} focusId={actualFocus} direction={direction} onSelect={selectNode} focusIds={focusIds} onFocusMode={onFocusMode}/>}</div>
    <div className="temporal-stats"><div><strong>{view?.counts.nodes.toLocaleString()??'—'}</strong><span>本年企业</span></div><div><strong>{view?.counts.edges.toLocaleString()??'—'}</strong><span>供货关系</span></div><div><strong>{view?`${view.counts.addedNodes} 家 / ${view.counts.addedEdges} 条`:'—'}</strong><span>新出现{view?.previousYear==null?' · 首期观测':''}</span></div><div><strong>{view?`${view.counts.removedNodes} 家 / ${view.counts.removedEdges} 条`:'—'}</strong><span>本期未见</span></div><details className="temporal-scope"><summary>数据范围</summary><p>{mode==='industry'?'历史分类年度样本，逐年保留已观测企业与供货关系。':'所选企业在各年末的全部直接供方与客户关系。'}</p><p>出现年份为当前网络的观测年份。本期变化相对上一可用年度。</p>{partialYears.length>0&&<p>{yearRanges(partialYears)} 年使用部分历史来源。</p>}<p>Gephi固定坐标：{ready?`${profileCoverage}/${view.counts.nodes}`:'正在读取'} 个本年节点。</p><p>2025增补截面单独保留在第三个视图。</p></details></div>
    <div className="temporal-timeline"><div className="temporal-playback"><button aria-label="上一年" title="上一年" disabled={!ready||year<=rangeStart} onClick={()=>step(-1)}>‹</button><button className="temporal-play" aria-label={playing?'暂停年度播放':'播放年度演变'} disabled={!ready||rangeYears.length<2} onClick={play}>{playing?'暂停':'播放'}</button><button aria-label="下一年" title="下一年" disabled={!ready||year>=rangeEnd} onClick={()=>step(1)}>›</button><strong>{year}</strong></div><div className="temporal-slider"><input type="range" aria-label="网络年份" min={rangeStart} max={rangeEnd} step={1} value={year} disabled={!ready} onChange={e=>changeYear(e.target.value)}/><div>{(model?.years||[2003,2025]).filter(y=>y===rangeStart||y===rangeEnd||y%5===0).filter(y=>y>=rangeStart&&y<=rangeEnd).map(y=><button key={y} onClick={()=>changeYear(y)} disabled={!ready}>{y}</button>)}</div></div><div className="temporal-time-options"><label>范围<select aria-label="起始年份" value={rangeStart} onChange={e=>changeStart(e.target.value)} disabled={!ready}>{(model?.years||[2003]).map(y=><option key={y}>{y}</option>)}</select><span>—</span><select aria-label="终止年份" value={rangeEnd} onChange={e=>changeEnd(e.target.value)} disabled={!ready}>{(model?.years||[2025]).map(y=><option key={y}>{y}</option>)}</select></label><label>速度<select aria-label="播放速度" value={speed} onChange={e=>setSpeed(Number(e.target.value))}>{[.5,1,2,4].map(n=><option key={n} value={n}>{n}×</option>)}</select></label></div></div>
  </section>;
}
