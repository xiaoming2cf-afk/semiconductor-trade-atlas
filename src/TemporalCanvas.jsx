import {forwardRef,useEffect,useImperativeHandle,useMemo,useRef} from 'react';
import {placeLabels,rectanglesOverlap} from './labelPlacement';


const palette=dark=>dark?{background:'#101f29',continuous:'#63b9c8',new:'#e6b56c',absent:'#8c9ca7',edge:'#668b9b',text:'#d7e7ed',muted:'#8da7b4',selected:'#cdf7fa'}:{background:'#f5f9fb',continuous:'#157b90',new:'#c18b3e',absent:'#95a5ad',edge:'#7f9ca8',text:'#244e5d',muted:'#7d96a1',selected:'#073e53'};

export default forwardRef(function TemporalCanvas({model,view,positions,theme,selectedId,highlightIds,onSelect,reducedMotion,duration=700},ref){
  const canvas=useRef(null),latest=useRef(null),camera=useRef({scale:1,x:0,y:0,fitScale:1}),surface=useRef({width:1,height:1,dpr:1}),raf=useRef(null),phase=useRef({start:0,duration:0}),drag=useRef(null),pickable=useRef([]),drawRef=useRef(null),hover=useRef(''),labelCache=useRef(null);
  const labelIds=useMemo(()=>{
    const degree=new Map();for(const e of view.edgeRows){degree.set(e.source,(degree.get(e.source)||0)+1);degree.set(e.target,(degree.get(e.target)||0)+1);}
    return new Set([...view.nodeIds].sort((a,b)=>(degree.get(b)||0)-(degree.get(a)||0)).slice(0,48));
  },[view]);
  latest.current={model,view,positions,theme,selectedId,highlightIds,labelIds,onSelect,reducedMotion,duration};

  function project(p){const v=camera.current;return {x:p.x*v.scale+v.x,y:-p.y*v.scale+v.y};}
  function requestDraw(){
    cancelAnimationFrame(raf.current);
    const tick=now=>{
      const p=phase.current.duration?Math.min(1,(now-phase.current.start)/phase.current.duration):1;
      drawRef.current?.(Math.max(0,p));
      if(p<1)raf.current=requestAnimationFrame(tick);
    };
    raf.current=requestAnimationFrame(tick);
  }
  function fit(){
    const points=[...latest.current.model.nodes.keys()].map(id=>latest.current.positions.get(id)).filter(Boolean);
    if(!points.length)return;
    let left=Infinity,right=-Infinity,bottom=Infinity,top=-Infinity;
    for(const p of points){left=Math.min(left,p.x);right=Math.max(right,p.x);bottom=Math.min(bottom,p.y);top=Math.max(top,p.y);}
    const {width,height}=surface.current,pad=65;
    const scale=Math.min(Math.max(1,width-pad*2)/Math.max(1,right-left),Math.max(1,height-pad*2)/Math.max(1,top-bottom));
    camera.current={scale,fitScale:scale,x:width/2-(left+right)/2*scale,y:height/2+(bottom+top)/2*scale};requestDraw();
  }
  function zoomBy(factor,point){
    const {width,height}=surface.current,p=point||{x:width/2,y:height/2},v=camera.current;
    const scale=Math.max(v.fitScale*.08,Math.min(v.fitScale*100,v.scale*factor));
    const ratio=scale/v.scale;camera.current={...v,scale,x:p.x-(p.x-v.x)*ratio,y:p.y-(p.y-v.y)*ratio};requestDraw();
  }
  function centerOn(id){
    const p=latest.current.positions.get(String(id));if(!p)return;
    const {width,height}=surface.current,v=camera.current,scale=Math.max(v.scale,v.fitScale*1.6);
    camera.current={...v,scale,x:width/2-p.x*scale,y:height/2+p.y*scale};requestDraw();
  }
  function nearest(point){
    let result=null,best=100;
    for(const n of pickable.current){const d=(n.x-point.x)**2+(n.y-point.y)**2;if(d<best){best=d;result=n;}}
    return result;
  }

  drawRef.current=progress=>{
    const el=canvas.current;if(!el)return;const ctx=el.getContext('2d');
    const {width,height,dpr}=surface.current,{view:frame,positions:xy,theme:currentTheme,selectedId:selection,highlightIds:highlights,labelIds:labels}=latest.current;
    const colors=palette(currentTheme==='dark');ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,width,height);ctx.fillStyle=colors.background;ctx.fillRect(0,0,width,height);
    let currentNodesDrawn=0,ghostNodesDrawn=0,currentEdgesDrawn=0,ghostEdgesDrawn=0;
    ctx.save();ctx.beginPath();ctx.rect(0,0,width,height);ctx.clip();
    const alpha=status=>status==='absent'?(1-progress)*.58:status==='new'?.15+.85*progress:1;
    const edges=progress<1?[...frame.ghostEdges,...frame.edgeRows]:frame.edgeRows;
    for(const e of edges){
      const a=xy.get(e.source),b=xy.get(e.target);if(!a||!b)continue;
      const p=project(a),q=project(b);
      if(Math.max(p.x,q.x)<-20||Math.min(p.x,q.x)>width+20||Math.max(p.y,q.y)<-20||Math.min(p.y,q.y)>height+20)continue;
      const selected=selection&&(e.source===selection||e.target===selection);
      ctx.globalAlpha=alpha(e.status)*(selected ? .85 : selection ? .09 : e.status==='new' ? .36 : .22);
      ctx.strokeStyle=selected?colors.continuous:e.status==='new'?colors.new:colors.edge;ctx.lineWidth=selected?1.2:.65;
      ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(q.x,q.y);ctx.stroke();
      if(e.status==='absent')ghostEdgesDrawn++;else currentEdgesDrawn++;
      const length=Math.hypot(q.x-p.x,q.y-p.y);
      if(length>22&&(edges.length<1800||selected)){
        const dx=(q.x-p.x)/length,dy=(q.y-p.y)/length,gap=6,x=q.x-dx*gap,y=q.y-dy*gap,s=selected?4:2.8;
        ctx.fillStyle=ctx.strokeStyle;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x-dx*s-dy*s*.55,y-dy*s+dx*s*.55);ctx.lineTo(x-dx*s+dy*s*.55,y-dy*s-dx*s*.55);ctx.closePath();ctx.fill();
      }
    }
    const picks=[],plotted=[],nodes=progress<1?[...frame.ghostRows,...frame.nodeRows]:frame.nodeRows;
    for(const n of nodes){
      const p=xy.get(n.id);if(!p)continue;const q=project(p);
      if(q.x<-35||q.x>width+35||q.y<-35||q.y>height+35)continue;
      const chosen=n.id===selection,matched=highlights?.has(n.id),focus=n.id===frame.focusId;
      const radius=chosen||focus?5.6:Math.max(2.1,Math.min(4.6,Number(p.size||10)/4));
      const color=chosen?colors.selected:colors[n.status]||colors.continuous;
      ctx.globalAlpha=alpha(n.status)*(selection&&!chosen&&!matched&&!focus ? .65 : 1);
      if(chosen||matched||n.status==='new'){
        const haloRadius=radius*(chosen||matched?4:3),halo=ctx.createRadialGradient(q.x,q.y,radius*.3,q.x,q.y,haloRadius);
        halo.addColorStop(0,color+'95');halo.addColorStop(.45,color+'35');halo.addColorStop(1,color+'00');
        ctx.fillStyle=halo;ctx.globalAlpha*=chosen||matched ? .5 : .4+(1-progress)*.15;ctx.beginPath();ctx.arc(q.x,q.y,haloRadius,0,Math.PI*2);ctx.fill();
        ctx.globalAlpha=alpha(n.status);
      }
      ctx.fillStyle=color;ctx.beginPath();ctx.arc(q.x,q.y,radius*(n.status==='new' ? .55+.45*progress : 1),0,Math.PI*2);ctx.fill();
      if(n.status==='absent')ghostNodesDrawn++;else currentNodesDrawn++;
      if(chosen||matched||focus){ctx.strokeStyle=colors.selected;ctx.lineWidth=1;ctx.beginPath();ctx.arc(q.x,q.y,radius+2,0,Math.PI*2);ctx.stroke();}
      plotted.push({...n,x:q.x,y:q.y,radius,chosen,matched,focus});
      if(n.status!=='absent'||progress<.75)picks.push({...n,x:q.x,y:q.y});
    }
    const v=camera.current,key=[v.scale,v.x,v.y,width,height,selection,hover.current].join('|');
    if(!labelCache.current||labelCache.current.key!==key||labelCache.current.frame!==frame||labelCache.current.positions!==xy||labelCache.current.highlights!==highlights){
      const ranks=new Map([...labels].map((id,i)=>[id,i])),candidates=[];
      for(const n of plotted){
        const hovered=n.id===hover.current;
        if(!n.chosen&&!n.focus&&!hovered&&!n.matched&&!labels.has(n.id))continue;
        const font=`${n.chosen||n.focus||hovered?'600 ':''}11px "Microsoft YaHei",sans-serif`;ctx.font=font;
        const full=n.label||`企业 ${n.id}`,chars=Array.from(full).slice(0,50),maxWidth=Math.min(n.chosen||hovered||n.focus?250:205,width-42);let cut=chars.length<Array.from(full).length;
        while(chars.length>1&&ctx.measureText(chars.join('')+(cut?'…':'')).width>maxWidth){chars.pop();cut=true;}
        const text=chars.join('')+(cut?'…':''),priority=n.chosen?110:hovered?100:n.focus?90:n.matched?80:20+(48-(ranks.get(n.id)||0))/48;
        candidates.push({...n,text,font,width:ctx.measureText(text).width+10,height:19,priority,mandatory:n.chosen||hovered||n.focus});
      }
      const reserved=[{x:8,y:8,width:Math.min(390,width-16),height:52},{x:width-150,y:8,width:142,height:45},{x:8,y:height-33,width:230,height:27},{x:width<520?8:width-240,y:height-(width<520?56:33),width:230,height:26}];
      labelCache.current={key,frame,positions:xy,highlights,items:placeLabels(candidates,{width,height,reserved,nodeBoxes:plotted.map(n=>({id:n.id,x:n.x-n.radius-2,y:n.y-n.radius-2,width:n.radius*2+4,height:n.radius*2+4})),limit:frame.focusId?(width<650?8:12):6})};
    }
    const visibleLabels=labelCache.current.items.filter(n=>n.status!=='absent'||progress<1);
    for(const n of visibleLabels){
      ctx.globalAlpha=alpha(n.status);
      if(n.leader){const dx=n.anchor.x-n.x,dy=n.anchor.y-n.y,length=Math.hypot(dx,dy),gap=n.radius+3;ctx.strokeStyle=colors.muted;ctx.lineWidth=.6;ctx.setLineDash([2,2]);ctx.beginPath();ctx.moveTo(n.x+dx/Math.max(1,length)*gap,n.y+dy/Math.max(1,length)*gap);ctx.lineTo(n.anchor.x,n.anchor.y);ctx.stroke();ctx.setLineDash([]);}
    }
    for(const n of visibleLabels){
      ctx.globalAlpha=alpha(n.status)*.9;ctx.fillStyle=colors.background;ctx.fillRect(n.box.x,n.box.y,n.box.width,n.box.height);
      ctx.globalAlpha=alpha(n.status);ctx.font=n.font;ctx.textBaseline='middle';ctx.textAlign='left';ctx.fillStyle=colors.text;ctx.fillText(n.text,n.box.x+5,n.box.y+n.box.height/2);
    }
    const labelBoxes=visibleLabels.map(n=>({id:n.id,text:n.text,...n.box,priority:n.priority,leader:n.leader}));let labelOverlaps=0;
    for(let i=0;i<labelBoxes.length;i++)for(let j=i+1;j<labelBoxes.length;j++)if(rectanglesOverlap(labelBoxes[i],labelBoxes[j],0))labelOverlaps++;
    const boxJSON=JSON.stringify(labelBoxes);if(el.dataset.labelBboxes!==boxJSON)el.dataset.labelBboxes=boxJSON;
    ctx.restore();ctx.globalAlpha=1;ctx.textAlign='left';ctx.fillStyle=colors.muted;ctx.font='11px "Microsoft YaHei",sans-serif';
    ctx.fillText(`${frame.year}-12-31 · ${frame.counts.nodes.toLocaleString()} 家企业 · ${frame.counts.edges.toLocaleString()} 条关系`,18,25);
    ctx.fillText('Gephi 固定布局 · 供方 → 客户',18,height-17);pickable.current=picks;
    Object.assign(el.dataset,{renderedYear:String(frame.year),renderedFocusId:frame.focusId,renderedDirection:frame.direction,transitionProgress:progress.toFixed(3),drawnCurrentNodes:String(currentNodesDrawn),drawnGhostNodes:String(ghostNodesDrawn),drawnCurrentEdges:String(currentEdgesDrawn),drawnGhostEdges:String(ghostEdgesDrawn),drawnLabels:String(labelBoxes.length),labelOverlaps:String(labelOverlaps),viewScale:camera.current.scale.toFixed(6),viewX:camera.current.x.toFixed(3),viewY:camera.current.y.toFixed(3)});
  };

  function downloadPNG(name){
    cancelAnimationFrame(raf.current);phase.current={start:0,duration:0};drawRef.current?.(1);
    const output=document.createElement('canvas');output.width=canvas.current.width;output.height=canvas.current.height;
    const ctx=output.getContext('2d');ctx.drawImage(canvas.current,0,0);
    const {width,height,dpr}=surface.current,colors=palette(latest.current.theme==='dark');ctx.setTransform(dpr,0,0,dpr,0,0);ctx.font='10px "Microsoft YaHei",sans-serif';ctx.textBaseline='middle';
    const legendY=height-(width<520?40:17);let legendX=width<520?18:width-235;
    for(const [status,label] of [['new','新出现'],['continuous','连续出现'],['absent','本期未见']]){ctx.fillStyle=colors[status];ctx.beginPath();ctx.arc(legendX+3,legendY,3,0,Math.PI*2);ctx.fill();ctx.fillStyle=colors.muted;ctx.fillText(label,legendX+12,legendY);legendX+=76;}
    output.toBlob(blob=>{if(!blob)return;const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);},'image/png');
  }
  useImperativeHandle(ref,()=>({fit,zoomBy,centerOn,downloadPNG}));

  useEffect(()=>{
    const el=canvas.current;const resize=()=>{
      const bounds=el.getBoundingClientRect(),old=surface.current,width=Math.max(1,bounds.width),height=Math.max(1,bounds.height),dpr=Math.min(window.devicePixelRatio||1,2);
      el.width=Math.round(width*dpr);el.height=Math.round(height*dpr);surface.current={width,height,dpr};
      camera.current.x+=(width-old.width)/2;camera.current.y+=(height-old.height)/2;
      if(old.width===1)fit();else requestDraw();
    };
    const observer=new ResizeObserver(resize);observer.observe(el);resize();
    const wheel=e=>{e.preventDefault();const r=el.getBoundingClientRect();zoomBy(Math.exp(-e.deltaY*.0012),{x:e.clientX-r.left,y:e.clientY-r.top});};
    el.addEventListener('wheel',wheel,{passive:false});
    return()=>{observer.disconnect();el.removeEventListener('wheel',wheel);cancelAnimationFrame(raf.current);};
  },[]);
  useEffect(()=>{fit();},[model,positions]);
  useEffect(()=>{const timing=latest.current;hover.current='';if(canvas.current)canvas.current.title='';phase.current={start:performance.now(),duration:timing.reducedMotion?0:timing.duration};requestDraw();},[view]);
  useEffect(()=>{
    const now=performance.now(),old=phase.current;
    if(reducedMotion)old.duration=0;
    else if(old.duration>0){const progress=Math.max(0,Math.min(1,(now-old.start)/old.duration));old.start=now-progress*duration;old.duration=duration;}
    requestDraw();
  },[duration,reducedMotion]);
  useEffect(()=>requestDraw(),[theme,selectedId,highlightIds,labelIds]);
  function localPoint(e){const r=canvas.current.getBoundingClientRect();return {x:e.clientX-r.left,y:e.clientY-r.top};}
  return <canvas ref={canvas} className="temporal-canvas" role="img" tabIndex={0} aria-label={`${view.year}年企业网络，${view.counts.nodes}家企业，${view.counts.edges}条供货关系。方向键平移，加减键缩放，Home复位。`} data-year={view.year} data-node-count={view.counts.nodes} data-edge-count={view.counts.edges} data-comparison-year={view.previousYear??''} data-added-nodes={view.counts.addedNodes} data-removed-nodes={view.counts.removedNodes} data-added-edges={view.counts.addedEdges} data-removed-edges={view.counts.removedEdges} data-focus-id={view.focusId} data-direction={view.direction} data-selected-id={selectedId}
    onPointerDown={e=>{const p=localPoint(e);drag.current={...p,lastX:p.x,lastY:p.y,moved:false};e.currentTarget.setPointerCapture(e.pointerId);}}
    onPointerMove={e=>{const p=localPoint(e),d=drag.current;if(d){if(Math.hypot(p.x-d.x,p.y-d.y)>3)d.moved=true;if(d.moved){camera.current.x+=p.x-d.lastX;camera.current.y+=p.y-d.lastY;requestDraw();}d.lastX=p.x;d.lastY=p.y;}else{const n=nearest(p);e.currentTarget.style.cursor=n?'pointer':'grab';e.currentTarget.title=n?`${n.label} · ${n.observed_year}`:'';if(hover.current!==(n?.id||'')){hover.current=n?.id||'';requestDraw();}}}}
    onPointerLeave={()=>{if(!drag.current&&hover.current){hover.current='';requestDraw();}}}
    onPointerUp={e=>{const d=drag.current;if(d&&!d.moved){const n=nearest(localPoint(e));latest.current.onSelect(n?.id||'');}drag.current=null;}}
    onPointerCancel={()=>{drag.current=null;}}
    onKeyDown={e=>{const offsets={ArrowLeft:[40,0],ArrowRight:[-40,0],ArrowUp:[0,40],ArrowDown:[0,-40]};if(offsets[e.key]){e.preventDefault();camera.current.x+=offsets[e.key][0];camera.current.y+=offsets[e.key][1];requestDraw();}else if(e.key==='+'||e.key==='='){e.preventDefault();zoomBy(1.25);}else if(e.key==='-'){e.preventDefault();zoomBy(.8);}else if(e.key==='Home'){e.preventDefault();fit();}}}/>;
});
