import {lazy,Suspense,useEffect,useMemo,useState} from 'react';
import Controls from './Controls';
import Inspector from './Inspector';
import Enterprise from './Enterprise';
import {located,nameOf,money,exportCSV} from './data';
import {catalogueFromIndex} from './products';
const TradeGlobe=lazy(()=>import('./TradeGlobe'));
export default function App(){
  const [tab,setTab]=useState('trade'),[year,setYear]=useState(2024),[product,setProduct]=useState('8542'),[data,setData]=useState(null),[loading,setLoading]=useState(true),[error,setError]=useState('');
  const [economy,setEconomy]=useState('all'),[direction,setDirection]=useState('all'),[minValue,setMinValue]=useState(1e10),[selected,setSelected]=useState(null),[mode,setMode]=useState('3d'),[region,setRegion]=useState('global');
  const [index,setIndex]=useState(null);
  useEffect(()=>{fetch('/data/index.json').then(r=>r.json()).then(setIndex).catch(()=>{setError('商品目录读取失败');setLoading(false)});},[]);
  const products=useMemo(()=>catalogueFromIndex(index),[index]);
  const productMeta=useMemo(()=>products.find(p=>p.code===product),[products,product]);
  const availableYears=useMemo(()=>index?.datasets?[...new Set(index.datasets.filter(d=>String(d.product)===product).map(d=>Number(d.year)))].sort((a,b)=>b-a):[2024],[index,product]);
  const dataset=useMemo(()=>index?.datasets.find(d=>String(d.product)===product&&Number(d.year)===year),[index,product,year]);
  const dataFile=dataset?.file?`/data/${dataset.file}`:'';
  useEffect(()=>{if(!products.length)return;const p=products.find(p=>p.code===product)||products[0];setProduct(p.code);setMinValue(p.defaultThresholdUsd);},[products]);
  useEffect(()=>{
    if(!dataFile)return;
    const controller=new AbortController();setLoading(true);setData(null);setError('');setSelected(null);
    fetch(dataFile,{signal:controller.signal}).then(r=>{if(!r.ok)throw new Error('该年度数据尚未就绪');return r.json()}).then(d=>{setData(d);setLoading(false)}).catch(e=>{if(e.name!=='AbortError'){setError(e.message);setLoading(false);}});
    return()=>controller.abort();
  },[year,product,dataFile]);
  const economies=useMemo(()=>new Map((data?.economies||[]).map(n=>[String(n.id),n])),[data]);
  useEffect(()=>{if(data&&economy!=='all'&&!economies.has(economy)){setEconomy('all');setDirection('all');}},[data,economies,economy]);
  useEffect(()=>setSelected(null),[minValue,direction]);
  const economyList=useMemo(()=>[...economies.values()].sort((a,b)=>nameOf(a).localeCompare(nameOf(b),'zh-CN')),[economies]);
  const flows=useMemo(()=>(data?.flows||[]).filter(e=>e.value_usd>=minValue&&(economy==='all'||(direction==='exports'?e.source===economy:direction==='imports'?e.target===economy:e.source===economy||e.target===economy))).sort((a,b)=>b.value_usd-a.value_usd),[data,minValue,economy,direction]);
  const stats=useMemo(()=>{let amount=0,mapped=0;const ids=new Set();for(const e of flows){amount+=e.value_usd;ids.add(e.source);ids.add(e.target);if(located(economies.get(e.source))&&located(economies.get(e.target)))mapped+=e.value_usd;}return {count:flows.length,amount,economies:ids.size,coverage:amount?mapped/amount*100:0,globalShare:data?.totals?.value_usd?amount/data.totals.value_usd*100:0};},[flows,economies,data]);
  const onProduct=code=>{const p=products.find(p=>p.code===code);if(!p)return;setProduct(p.code);setMinValue(p.defaultThresholdUsd);setSelected(null);const years=index.datasets.filter(d=>String(d.product)===p.code).map(d=>Number(d.year));if(!years.includes(year))setYear(Math.max(...years));};
  const chooseEconomy=id=>{setEconomy(id);if(id==='all')setDirection('all');setSelected(null)};
  return <div className="app-shell"><header className="app-header"><a className="brand" href="#" onClick={e=>{e.preventDefault();setTab('trade')}}><span className="brand-mark">◉</span><span>芯片产业链<span className="brand-divider">/</span><b>研究地图</b></span></a><nav aria-label="主导航"><button className={tab==='trade'?'active':''} onClick={()=>setTab('trade')}>全球贸易</button><button className={tab==='enterprise'?'active':''} onClick={()=>setTab('enterprise')}>企业供货网络</button></nav><span className="header-source">{tab==='trade'?'CEPII BACI · 2017—2024':'FactSet · 2025'}</span></header>
    {tab==='enterprise'?<Enterprise/>:<><div className="workspace"><Controls {...{year,setYear,product,onProduct,economy,setEconomy:chooseEconomy,direction,setDirection,minValue,setMinValue,stats,data,availableYears,products,productMeta,dataFile}} economies={economyList} onExport={()=>exportCSV(flows,economies,year,product)}/><main className="map-main"><div className="map-toolbar"><div><h1>{productMeta?.title||'商品贸易'}</h1><span>{year} 年 · 全球双边贸易流</span></div><div className="map-actions"><div className="segmented">{[['3d','三维地球'],['2d','平面地图']].map(([v,l])=><button key={v} className={mode===v?'active':''} onClick={()=>setMode(v)}>{l}</button>)}</div><div className="view-presets">{[['global','全球'],['asia','亚太'],['usa','美国']].map(([v,l])=><button key={v} className={region===v?'active':''} onClick={()=>setRegion(v)}>{l}</button>)}</div></div></div><div className="map-container"><Suspense fallback={<div className="loading-surface">正在加载地球</div>}><TradeGlobe {...{flows,economies,selected,mode,region,economy,stats}} onSelect={setSelected}/></Suspense>{loading&&<div className="loading-toast">正在加载 {year} 年贸易数据…</div>}{error&&<div className="loading-toast error-toast">{error}</div>}</div><footer className="map-footer"><div><strong>{stats.economies}</strong><span>经济体</span></div><div><strong>{stats.count.toLocaleString()}</strong><span>有向贸易流</span></div><div><strong>{money(stats.amount)}</strong><span>筛选贸易额</span></div><div><strong>{stats.globalShare.toFixed(2)}%</strong><span>占全球同类贸易额</span></div></footer></main><Inspector {...{selected,flows,economies,setSelected,year,product,productMeta}} total={data?.totals?.value_usd}/></div></>}
  </div>;
}
