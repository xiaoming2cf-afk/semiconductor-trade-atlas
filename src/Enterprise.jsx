import {useEffect,useState} from 'react';
import EnterpriseStatic from './EnterpriseStatic';
import EnterpriseTimeline from './EnterpriseTimeline';
import {readTemporalJSON} from './temporalLoader';
import './enterpriseTemporal.css';
const views=[['industry','行业年度演变'],['focus','企业供方网络'],['static','2025增补截面']];
export default function Enterprise(){
  const [mode,setMode]=useState('industry'),[focusId,setFocusId]=useState(''),[registry,setRegistry]=useState(null),[registryStatus,setRegistryStatus]=useState('loading'),[retry,setRetry]=useState(0);
  useEffect(()=>{
    let active=true;setRegistryStatus('loading');
    readTemporalJSON('registry.json',false).then(data=>{
      if(!active)return;setRegistry(data);setRegistryStatus('ready');
      const companies=data.focus_companies||[];setFocusId(id=>companies.some(n=>String(n.id)===id)?id:String(data.default_focus_id||companies[0]?.id||''));
    }).catch(error=>{if(active)setRegistryStatus(error.preparing?'preparing':'error');});
    return()=>{active=false};
  },[retry]);
  const focusMode=id=>{setFocusId(String(id));setMode('focus');};
  function tabKey(event,index){
    let next=null;if(event.key==='ArrowRight')next=(index+1)%views.length;else if(event.key==='ArrowLeft')next=(index+views.length-1)%views.length;else if(event.key==='Home')next=0;else if(event.key==='End')next=views.length-1;
    if(next!=null){event.preventDefault();setMode(views[next][0]);event.currentTarget.parentElement.querySelectorAll('[role="tab"]')[next].focus();}
  }
  return <div className="enterprise-explorer"><div className="enterprise-view-tabs" role="tablist" aria-label="企业网络视图">{views.map(([value,label],index)=><button key={value} id={`enterprise-tab-${value}`} role="tab" aria-controls={`enterprise-panel-${value}`} tabIndex={mode===value?0:-1} aria-selected={mode===value} className={mode===value?'active':''} onClick={()=>setMode(value)} onKeyDown={event=>tabKey(event,index)}>{label}</button>)}</div>{mode==='static'?<EnterpriseStatic/>:<EnterpriseTimeline {...{mode,registry,registryStatus,focusId,setFocusId}} onRetryRegistry={()=>setRetry(n=>n+1)} onFocusMode={focusMode}/>}</div>;
}
