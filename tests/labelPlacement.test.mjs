import test from 'node:test';
import assert from 'node:assert/strict';
import {placeLabels,rectanglesOverlap} from '../src/labelPlacement.js';

test('rectangle intersection includes actual overlaps but not separated boxes',()=>{
  assert.equal(rectanglesOverlap({x:0,y:0,width:30,height:20},{x:20,y:10,width:30,height:20},0),true);
  assert.equal(rectanglesOverlap({x:0,y:0,width:30,height:20},{x:35,y:25,width:30,height:20},0),false);
});
test('crowded labels retain selected and hover names without intersecting text',()=>{
  const candidates=Array.from({length:20},(_,i)=>({id:String(i),x:340+(i%4)*3,y:210+Math.floor(i/4)*3,radius:3,width:155+(i%3)*10,height:19,priority:i===0?110:i===1?100:20-i*.1,mandatory:i<2}));
  const before=JSON.stringify(candidates),labels=placeLabels(candidates,{width:850,height:480,nodeBoxes:candidates.map(n=>({id:n.id,x:n.x-4,y:n.y-4,width:8,height:8})),reserved:[{x:10,y:10,width:350,height:45}],limit:10});
  assert(labels.some(n=>n.id==='0'));assert(labels.some(n=>n.id==='1'));assert(labels.length>2);
  for(let i=0;i<labels.length;i++)for(let j=i+1;j<labels.length;j++){
    const a=labels[i].box,b=labels[j].box,overlapX=Math.min(a.x+a.width,b.x+b.width)-Math.max(a.x,b.x),overlapY=Math.min(a.y+a.height,b.y+b.height)-Math.max(a.y,b.y);
    assert(!(overlapX>0&&overlapY>0));
  }
  assert.equal(JSON.stringify(candidates),before);
});
test('labels respect reserved HUD and the viewport',()=>{
  const reserved=[{x:5,y:5,width:280,height:55}],items=placeLabels([{id:'root',x:145,y:75,radius:6,width:160,height:19,priority:110,mandatory:true}],{width:330,height:250,reserved});
  assert.equal(items.length,1);const box=items[0].box;
  assert(box.x>=10&&box.y>=10&&box.x+box.width<=320&&box.y+box.height<=240);
  assert.equal(rectanglesOverlap(box,reserved[0],0),false);
});
