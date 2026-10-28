import {useState,useEffect} from 'react';
import {money,nameOf} from './data';
export default function Inspector({selected,flows,economies,setSelected,year,product,productMeta,total}) {
  const [limit,setLimit]=useState(40);
  useEffect(()=>setLimit(40),[flows]);
  const node=selected?.type==='node'?economies.get(selected.id):null;
  const edge=selected?.type==='edge'?selected.edge:null;
  const s=edge&&economies.get(edge.source),t=edge&&economies.get(edge.target);
  const productName=productMeta?.name||product;
  return <aside className={`inspector ${selected?'has-selection':''}`}>
    <div className="rail-heading"><h2>选中记录</h2>{selected&&<button className="clear-button" onClick={()=>setSelected(null)} aria-label="清除选择">×</button>}</div>
    <section className="selection">
      {!selected?<><div className="selection-symbol">↗</div><h3>探索贸易联系</h3><p>点击地球上的经济体或贸易线，查看进出口记录。</p></>:node?<><span className="record-type">经济体 · {node.iso3}</span><h3>{nameOf(node)}</h3><dl><dt>年份 / 商品</dt><dd>{year} / {productName}</dd><dt>出口总额</dt><dd>{money(node.exports_usd,true)}</dd><dt>进口总额</dt><dd>{money(node.imports_usd,true)}</dd><dt>经纬度</dt><dd>{node.lon?.toFixed(2)}°, {node.lat?.toFixed(2)}°</dd></dl></>:edge?<><span className="record-type">有向贸易流</span><h3 className="trade-title">{nameOf(s)}<span>→</span>{nameOf(t)}</h3><div className="selected-amount">{money(edge.value_usd)}</div><dl><dt>贸易额</dt><dd>{money(edge.value_usd,true)}</dd><dt>年份 / 商品</dt><dd>{year} / {productName}</dd><dt>出口方</dt><dd>{nameOf(s)}</dd><dt>进口方</dt><dd>{nameOf(t)}</dd>{productMeta?.quantityDefined&&edge.quantity_tonnes!=null&&<><dt>贸易量（吨）</dt><dd>{Number(edge.quantity_tonnes).toLocaleString("zh-CN",{maximumFractionDigits:3})}</dd></>}<dt>占全球本商品</dt><dd>{total?((edge.value_usd/total)*100).toFixed(3):'—'}%</dd></dl></>:null}
    </section>
    <div className="flow-list-heading"><h2>当前贸易流</h2><span>{flows.length.toLocaleString()} 条</span></div>
    <div className="flow-list">{flows.slice(0,limit).map((e,i)=><button key={`${e.source}-${e.target}`} className={`flow-row ${edge?.source===e.source&&edge?.target===e.target?'selected':''}`} onClick={()=>setSelected({type:'edge',edge:e})}><span className="rank">{i+1}</span><span className="flow-route">{nameOf(economies.get(e.source))}<span className="flow-arrow">→</span>{nameOf(economies.get(e.target))}</span><span className="flow-value">{money(e.value_usd)}</span></button>)}{flows.length>limit&&<button className="load-more" onClick={()=>setLimit(v=>v+50)}>再显示 50 条</button>}{!flows.length&&<p className="empty-list">当前筛选没有贸易记录。</p>}</div>
  </aside>;
}
