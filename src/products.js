const GROUP_NAMES={
  integrated_circuits:'集成电路', ic:'集成电路',
  semiconductor_devices:'半导体器件', devices:'半导体器件',
  manufacturing_equipment:'制造设备', manufacturing:'制造设备',
  test_equipment:'检测设备', testing:'检测设备',
  semiconductor_wafers:'材料', materials:'材料',
};
// Existing published datasets predate the extended catalogue metadata.
const LEGACY_ATTRIBUTES={
  '8542':{group_id:'integrated_circuits',group_name_zh:'集成电路',defaultThresholdUsd:1e10},
  '281111':{group_id:'materials',group_name_zh:'材料',defaultThresholdUsd:1e7},
};
const SCOPE_NAMES={core:'芯片相关',core_related_mixed:'芯片相关（混合范围）',electronics_specific:'电子专用',associated_broad_use:'兼具其他用途'};
export function normalizeProduct(item){
  const code=String(item.code??item.id);
  const p={...LEGACY_ATTRIBUTES[code],...item};
  const hs6Codes=(p.hs6_codes||p.hs6||[]).map(String);
  const name=p.name_zh||p.label||p.name||code;
  const groupId=p.group_id||'products';
  const total=p.is_group_total===true||p.aggregation_level==='group'||p.aggregation_level==='stage'||hs6Codes.length>1;
  const scopeCode=typeof p.scope==='string'?p.scope:(p.scope?.label||'');
  const sources=(p.source_urls||[]).map(s=>typeof s==='string'?{url:s,label:new URL(s).hostname.replace(/^www\./,'')}:s);
  return {...p,code,name,hs6Codes,groupId,groupName:p.group_name_zh||p.group_name||GROUP_NAMES[groupId]||'商品',
    title:p.title_zh||`${total?(p.group_name_zh||name.replace(/合计$/,'')):name}贸易`,isGroupTotal:total,scopeCode,scope:SCOPE_NAMES[scopeCode]||scopeCode,
    scopeNote:p.scope_note||p.scope_boundary||p.boundary_note||p.description||'',
    officialName:p.official_name||'',baciOriginalName:p.baci_original_name||'',sources,
    defaultThresholdUsd:Number(p.defaultThresholdUsd??p.default_threshold_usd??1e7),
    quantityDefined:p.quantity_defined===true,
    order:Number(p.display_order??100)};
}
export function catalogueFromIndex(index){
  const published=new Set((index?.datasets||[]).map(d=>String(d.product)));
  return (index?.products||[]).filter(p=>published.has(String(p.code??p.id))).map(normalizeProduct).sort((a,b)=>a.order-b.order);
}
export function productGroups(products=[],query='',currentCode=''){
  const search=query.trim().toLocaleLowerCase();
  const groups=new Map();
  for(const p of products){
    if(search&&p.code!==currentCode&&!`${p.name} ${p.code} ${p.hs6Codes.join(' ')} ${p.groupName}`.toLocaleLowerCase().includes(search))continue;
    if(!groups.has(p.groupId))groups.set(p.groupId,{id:p.groupId,name:p.groupName,products:[]});
    groups.get(p.groupId).products.push(p);
  }
  return [...groups.values()];
}
export const productOptionLabel=p=>p.isGroupTotal?`环节合计 · ${p.groupName}`:`${/^\d+$/.test(p.code)?p.code+' · ':''}${p.name}`;
