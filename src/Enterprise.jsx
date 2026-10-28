import {useEffect,useState} from 'react';
import {assetUrl} from './assetUrl';
export default function Enterprise(){
  const [scale,setScale]=useState(1),[meta,setMeta]=useState(null);
  useEffect(()=>{fetch(assetUrl('enterprise/metadata.json')).then(r=>r.json()).then(setMeta)},[]);
  return <section className="enterprise-page"><div className="enterprise-toolbar"><div><h1>企业供货网络</h1><p>{meta?.snapshot} · {meta?.node_count} 家企业 · {meta?.directed_edge_count} 条供货关系</p></div><div className="enterprise-actions"><button onClick={()=>setScale(v=>Math.max(.5,v-.25))} aria-label="缩小企业图">−</button><span>{Math.round(scale*100)}%</span><button onClick={()=>setScale(v=>Math.min(4,v+.25))} aria-label="放大企业图">＋</button><button onClick={()=>setScale(1)}>适应宽度</button><a href={assetUrl('enterprise/network.png')} download>下载 PNG</a><a href={assetUrl('enterprise/network.gephi')} download>下载 Gephi 工程</a></div></div><div className="enterprise-canvas"><img src={assetUrl('enterprise/network.png')} alt="2025年末339家企业及691条有向供货关系，使用Gephi原生布局导出的完整网络图" style={{width:`${scale*100}%`}} draggable="false"/></div><div className="enterprise-caption">供方 → 客户　·　FactSet 2025-12-31　·　Gephi 原生网络图</div></section>
}
