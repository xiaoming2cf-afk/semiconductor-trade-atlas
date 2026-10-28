export const rectanglesOverlap=(a,b,padding=2)=>a.x<b.x+b.width+padding&&a.x+a.width+padding>b.x&&a.y<b.y+b.height+padding&&a.y+a.height+padding>b.y;

export function placeLabels(candidates,{width,height,nodeBoxes=[],reserved=[],limit=10}){
  const placed=[],occupied=[...reserved],inside=b=>b.x>=10&&b.y>=10&&b.x+b.width<=width-10&&b.y+b.height<=height-10;
  const available=(box,id,avoidNodes)=>inside(box)&&!occupied.some(other=>rectanglesOverlap(box,other,3))&&(!avoidNodes||!nodeBoxes.some(other=>other.id!==id&&rectanglesOverlap(box,other,2)));
  for(const item of [...candidates].sort((a,b)=>b.priority-a.priority)){
    if(placed.length>=limit&&!item.mandatory)continue;
    const w=item.width,h=item.height||19,r=item.radius||3,choices=[];
    for(const gap of [8,20,40,68,100,142]){
      const d=r+gap;
      choices.push({x:item.x+d,y:item.y-h/2},{x:item.x-d-w,y:item.y-h/2},
        {x:item.x-w/2,y:item.y-d-h},{x:item.x-w/2,y:item.y+d},
        {x:item.x+d,y:item.y-d-h},{x:item.x-d-w,y:item.y+d},
        {x:item.x+d,y:item.y+d},{x:item.x-d-w,y:item.y-d-h});
    }
    let box=choices.map(p=>({...p,width:w,height:h})).find(p=>available(p,item.id,true));
    if(!box&&item.mandatory){
      const corners=[{x:12,y:74},{x:width-w-12,y:74},{x:12,y:height-h-65},{x:width-w-12,y:height-h-65}];
      box=[...choices,...corners].map(p=>({...p,width:w,height:h})).find(p=>available(p,item.id,false));
    }
    if(!box)continue;
    occupied.push(box);
    const anchor={x:Math.max(box.x,Math.min(item.x,box.x+w)),y:Math.max(box.y,Math.min(item.y,box.y+h))};
    placed.push({...item,box,anchor,leader:Math.hypot(anchor.x-item.x,anchor.y-item.y)>r+14});
  }
  return placed;
}
