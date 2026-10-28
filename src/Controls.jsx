import {useMemo,useState} from 'react';
import {money,nameOf} from './data';
import {productGroups,productOptionLabel} from './products';
export default function Controls({year,setYear,product,onProduct,economies,economy,setEconomy,direction,setDirection,minValue,setMinValue,stats,onExport,data,availableYears,products,productMeta,dataFile}) {
  const [search,setSearch]=useState('');
  const groups=useMemo(()=>productGroups(products,search,product),[products,search,product]);
  const thresholds=useMemo(()=>[...new Set([0,1e4,1e5,1e6,1e7,1e8,1e9,1e10,productMeta?.defaultThresholdUsd,minValue].filter(v=>Number.isFinite(v)&&v>=0))].sort((a,b)=>a-b),[productMeta,minValue]);
  return <aside className="controls">
    <div className="rail-heading"><h2>贸易筛选</h2><span>{year}</span></div>
    <label>商品<input className="product-search" type="search" aria-label="搜索商品或HS编码" placeholder="搜索商品或 HS 编码" value={search} onChange={e=>setSearch(e.target.value)}/><select aria-label="商品" title={productMeta?.name} value={product} onChange={e=>onProduct(e.target.value)}>{groups.map(group=><optgroup key={group.id} label={group.name}>{group.products.map(p=><option key={p.code} value={p.code}>{productOptionLabel(p)}</option>)}</optgroup>)}</select></label>
    <label>年份<select aria-label="年份" value={year} onChange={e=>setYear(Number(e.target.value))}>{availableYears.map(y=><option key={y}>{y}</option>)}</select></label>
    <label>经济体<select aria-label="经济体" value={economy} onChange={e=>setEconomy(e.target.value)}><option value="all">全部经济体</option>{economies.map(n=><option key={n.id} value={n.id}>{nameOf(n)}</option>)}</select></label>
    <fieldset className="direction"><legend>贸易方向</legend>{[['all','全部'],['exports','出口'],['imports','进口']].map(([v,l])=><button key={v} className={direction===v?'active':''} disabled={economy==='all'&&v!=='all'} onClick={()=>setDirection(v)}>{l}</button>)}</fieldset>
    <label className="amount-label">最低贸易额<span>{money(minValue)}</span><select aria-label="最低贸易额" value={minValue} onChange={e=>setMinValue(Number(e.target.value))}>{thresholds.map(v=><option key={v} value={v}>{v===0?'显示全部':money(v)}</option>)}</select></label>
    <div className="filter-note">箭头从出口方指向进口方，线宽随贸易额变化。</div>
    <button className="export-button" onClick={onExport} disabled={!data}>导出当前贸易流 CSV <span>↓</span></button>
    <details className="data-scope"><summary>数据范围</summary><dl><dt>来源</dt><dd>CEPII BACI</dd><dt>金额</dt><dd>当年美元</dd><dt>当前贸易流</dt><dd>{stats.count.toLocaleString()} 条</dd><dt>坐标覆盖</dt><dd>{stats.coverage.toFixed(2)}%</dd><dt>商品</dt><dd>{productMeta?.name}</dd>{productMeta?.scope&&<><dt>范围</dt><dd>{productMeta.scope}</dd></>}{productMeta?.hs6Codes.length>0&&<><dt>HS6</dt><dd>{productMeta.hs6Codes.join('、')}</dd></>}</dl>{productMeta?.scopeNote&&<p className="product-scope-note">{productMeta.scopeNote}</p>}{(productMeta?.officialName||productMeta?.baciOriginalName||productMeta?.sources.length>0)&&<details className="product-sources"><summary>商品原名与来源</summary>{productMeta?.officialName&&<p><b>HS2017 原名</b>{productMeta.officialName}</p>}{productMeta?.baciOriginalName&&<p><b>BACI 原名</b>{productMeta.baciOriginalName}</p>}{productMeta?.oecd_table&&<p>OECD 附表 {productMeta.oecd_table}</p>}{productMeta?.sources.map((source,i)=><a key={source.url||i} href={source.url} target="_blank" rel="noreferrer">{source.label||source.title||source.url}</a>)}</details>}<p>坐标覆盖按当前筛选贸易额计算。</p><a href={dataFile} download>下载本年完整数据 JSON</a><a className="scope-download" href="/data/研究商品范围.csv" download>下载商品范围 CSV</a></details>
    <div className="rail-footer">芯片产业链研究<br/><span>贸易与企业供货网络</span></div>
  </aside>;
}
