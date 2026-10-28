export const money = (v,precise=false) => {
  if (v==null || !Number.isFinite(Number(v))) return '—';
  if (precise) return `${Number(v).toLocaleString('zh-CN',{maximumFractionDigits:0})} 美元`;
  if (v>=1e8) return `${(v/1e8).toLocaleString('zh-CN',{maximumFractionDigits:2})} 亿美元`;
  if (v>=1e4) return `${(v/1e4).toLocaleString('zh-CN',{maximumFractionDigits:1})} 万美元`;
  return `${Number(v).toLocaleString('zh-CN',{maximumFractionDigits:0})} 美元`;
};
export const located = n => n && typeof n.lon==='number' && typeof n.lat==='number' && Number.isFinite(n.lon) && Number.isFinite(n.lat);
const chineseNames={'Bonaire':'博内尔','Christmas Isds':'圣诞岛','Cocos Isds':'科科斯群岛','Gibraltar':'直布罗陀','Tokelau':'托克劳'};
export const nameOf = n => chineseNames[n?.zh] || chineseNames[n?.raw_label] || n?.zh || n?.en || n?.iso3 || n?.id || '未知经济体';
export function exportCSV(flows,economies,year,product) {
  const header=['year','product','exporter_id','exporter_name','importer_id','importer_name','value_usd'];
  const cell=v=>`"${String(v??'').replaceAll('"','""')}"`;
  const text='\ufeff'+[header,...flows.map(e=>[year,product,e.source,nameOf(economies.get(e.source)),e.target,nameOf(economies.get(e.target)),e.value_usd])].map(r=>r.map(cell).join(',')).join('\r\n');
  const url=URL.createObjectURL(new Blob([text],{type:'text/csv;charset=utf-8'}));
  const a=document.createElement('a');a.href=url;a.download=`贸易流_${year}_${product}.csv`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
