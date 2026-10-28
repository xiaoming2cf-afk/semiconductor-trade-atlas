export function prepareBundle(raw){
  if(!Array.isArray(raw.nodes)||!Array.isArray(raw.edges)||!Array.isArray(raw.frames))throw new Error('时序数据缺少节点、关系或年度记录');
  const nodes=new Map(raw.nodes.map(n=>[String(n.id),{...n,id:String(n.id)}]));
  const edges=new Map(raw.edges.map(e=>[String(e.id),{...e,id:String(e.id),source:String(e.source),target:String(e.target)}]));
  if(nodes.size!==raw.nodes.length||edges.size!==raw.edges.length)throw new Error('时序数据存在重复记录编号');
  const frames=new Map(),nodeYears=new Map();
  for(const frame of raw.frames){
    const year=Number(frame.year),nodeIds=new Set(frame.node_ids.map(String)),edgeIds=new Set(frame.edge_ids.map(String));
    if(frames.has(year))throw new Error('年度记录重复');
    const states=new Map((frame.node_states||[]).map(n=>[String(n.id),{...n,id:String(n.id),observed_year:year}]));
    for(const id of nodeIds){
      if(!nodes.has(id))throw new Error(`节点记录缺失：${id}`);
      if(!nodeYears.has(id))nodeYears.set(id,[]);
      nodeYears.get(id).push(year);
      if(!states.has(id)){
        const profile=(nodes.get(id).profiles||[]).find(p=>Number(p.year)===year);
        states.set(id,{...profile,id,label:profile?.label||`企业 ${id}`,observed_year:year});
      }
    }
    for(const id of edgeIds){
      const e=edges.get(id);
      if(!e||!nodeIds.has(e.source)||!nodeIds.has(e.target))throw new Error(`关系端点缺失：${id}`);
    }
    frames.set(year,{...frame,year,nodeIds,edgeIds,states});
  }
  const years=[...frames.keys()].sort((a,b)=>a-b);
  for(const values of nodeYears.values())values.sort((a,b)=>a-b);
  return {raw,nodes,edges,frames,years,nodeYears,appearanceCache:new Map(),metadata:raw.metadata||{}};
}

export function preparePositions(raw){
  const source=raw.positions??raw.nodes??{};
  const rows=Array.isArray(source)?source:Object.entries(source).map(([id,p])=>({id,...p}));
  const positions=new Map();
  for(const p of rows){
    if(p.id==null||p.id==='')continue;
    if(p.x==null||p.y==null||p.x===''||p.y==='')continue;
    const x=Number(p.x),y=Number(p.y);
    if(Number.isFinite(x)&&Number.isFinite(y))positions.set(String(p.id),{...p,id:String(p.id),x,y});
  }
  if(!positions.size)throw new Error('Gephi布局坐标尚未载入');
  return {positions,layout:raw.layout||raw.metadata?.layout||'Gephi固定布局',metadata:raw.metadata||{}};
}

function annualSets(model,year,focusId,direction){
  const frame=model.frames.get(Number(year));
  if(!frame)return {frame:null,nodeIds:new Set(),edgeIds:new Set()};
  if(!focusId)return {frame,nodeIds:new Set(frame.nodeIds),edgeIds:new Set(frame.edgeIds)};
  const edgeIds=new Set(),nodeIds=new Set();
  if(frame.nodeIds.has(focusId))nodeIds.add(focusId);
  for(const id of frame.edgeIds){
    const e=model.edges.get(id);
    const include=direction==='upstream'?e.target===focusId:direction==='downstream'?e.source===focusId:e.source===focusId||e.target===focusId;
    if(include){edgeIds.add(id);nodeIds.add(e.source);nodeIds.add(e.target);}
  }
  return {frame,nodeIds,edgeIds};
}

export function frameView(model,year,focusId='',direction='both'){
  direction=focusId?direction:'both';
  const current=annualSets(model,year,String(focusId||''),direction);
  const previousYear=model.years.filter(y=>y<Number(year)).at(-1)??null;
  const previous=annualSets(model,previousYear,String(focusId||''),direction);
  const addedNodes=new Set([...current.nodeIds].filter(id=>!previous.nodeIds.has(id)));
  const removedNodes=new Set([...previous.nodeIds].filter(id=>!current.nodeIds.has(id)));
  const addedEdges=new Set([...current.edgeIds].filter(id=>!previous.edgeIds.has(id)));
  const removedEdges=new Set([...previous.edgeIds].filter(id=>!current.edgeIds.has(id)));
  const nodeRows=[...current.nodeIds].map(id=>({...current.frame.states.get(id),id,status:addedNodes.has(id)?'new':'continuous'}));
  const ghostRows=[...removedNodes].map(id=>({...previous.frame.states.get(id),id,status:'absent'}));
  const edgeRows=[...current.edgeIds].map(id=>({...model.edges.get(id),status:addedEdges.has(id)?'new':'continuous'}));
  const ghostEdges=[...removedEdges].map(id=>({...model.edges.get(id),status:'absent'}));
  return {year:Number(year),previousYear,frame:current.frame,nodeIds:current.nodeIds,edgeIds:current.edgeIds,nodeRows,edgeRows,ghostRows,ghostEdges,addedNodes,removedNodes,addedEdges,removedEdges,focusId:String(focusId||''),direction,
    counts:{nodes:current.nodeIds.size,edges:current.edgeIds.size,addedNodes:addedNodes.size,removedNodes:removedNodes.size,addedEdges:addedEdges.size,removedEdges:removedEdges.size}};
}

export function stateAt(model,id,year){
  const exact=model.frames.get(Number(year))?.states.get(String(id));
  if(exact)return {...exact,present:true};
  const prior=(model.nodeYears.get(String(id))||[]).filter(y=>y<Number(year)).at(-1);
  if(prior!=null)return {...model.frames.get(prior).states.get(String(id)),present:false};
  return {id:String(id),label:`企业 ${id}`,observed_year:null,present:false};
}

export function appearanceIndex(model,focusId='',direction='both'){
  if(!focusId)return model.nodeYears;
  const key=`${focusId}:${direction}`;
  if(model.appearanceCache.has(key))return model.appearanceCache.get(key);
  const years=new Map();
  for(const year of model.years)for(const id of annualSets(model,year,focusId,direction).nodeIds){if(!years.has(id))years.set(id,[]);years.get(id).push(year);}
  model.appearanceCache.set(key,years);return years;
}
export function appearanceYears(model,id,focusId='',direction='both'){
  return appearanceIndex(model,focusId,direction).get(String(id))||[];
}

export function searchNodes(model,query,year){
  const term=query.trim().toLocaleLowerCase();if(!term)return [];
  const active=model.frames.get(Number(year))?.nodeIds||new Set();
  const names=n=>[n.label,...(n.search_names||[]),...(n.profiles||[]).map(p=>p.label)].filter(Boolean).map(s=>String(s).toLocaleLowerCase());
  const score=n=>(n.id.toLocaleLowerCase()===term?100:0)+(names(n).includes(term)?20:0)+(active.has(n.id)?1:0);
  return [...model.nodes.values()].filter(n=>[n.id,...names(n)].join(' ').toLocaleLowerCase().includes(term)).sort((a,b)=>score(b)-score(a)).slice(0,30);
}

export function neighbours(model,id,year,allowedEdgeIds){
  const suppliers=new Set(),customers=new Set();
  for(const edgeId of allowedEdgeIds||model.frames.get(Number(year))?.edgeIds||[]){const e=model.edges.get(edgeId);if(e.target===id)suppliers.add(e.source);if(e.source===id)customers.add(e.target);}
  const rows=ids=>[...ids].map(nodeId=>stateAt(model,nodeId,year)).sort((a,b)=>a.label.localeCompare(b.label,'zh-CN'));
  return {suppliers:rows(suppliers),customers:rows(customers)};
}

export function yearRanges(years){
  const result=[];let start=null,end=null;
  for(const year of years){if(start==null){start=end=year;}else if(year===end+1){end=year;}else{result.push(start===end?String(start):`${start}—${end}`);start=end=year;}}
  if(start!=null)result.push(start===end?String(start):`${start}—${end}`);
  return result.join('、');
}

export function currentRows(model,view,positions){
  const snapshot=view.frame?.snapshot||`${view.year}-12-31`;
  const scope={network_kind:view.focusId?'direct_company_relations':'annual_industry_sample',focus_id:view.focusId,direction:view.focusId?view.direction:'both'};
  const observed=appearanceIndex(model,view.focusId,view.direction);
  const nodes=view.nodeRows.map(n=>{const p=positions.get(n.id);return {...scope,year:view.year,snapshot,id:n.id,label:n.label,home_region:n.home_region??'',status:n.status,comparison_year:view.previousYear??'',first_observed_year:observed.get(n.id)?.[0]??'',observed_years:(observed.get(n.id)||[]).join(';'),x:p?.x??'',y:p?.y??''};});
  const edges=view.edgeRows.map(e=>({...scope,year:view.year,snapshot,id:e.id,source:e.source,target:e.target,source_label:stateAt(model,e.source,view.year).label,target_label:stateAt(model,e.target,view.year).label,weight:e.weight??'',status:e.status,comparison_year:view.previousYear??''}));
  return {nodes,edges};
}

export function downloadText(name,text,type='text/plain;charset=utf-8'){
  const url=URL.createObjectURL(new Blob([text],{type})),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
export function downloadCSV(name,rows,columns){
  const fields=columns||Object.keys(rows[0]||{}),quote=v=>`"${String(v??'').replaceAll('"','""')}"`;
  downloadText(name,'\ufeff'+[fields,...rows.map(row=>fields.map(k=>row[k]))].map(row=>row.map(quote).join(',')).join('\r\n'),'text/csv;charset=utf-8');
}
