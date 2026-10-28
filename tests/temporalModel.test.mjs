import test from 'node:test';
import assert from 'node:assert/strict';
import {prepareBundle,preparePositions,frameView,stateAt,appearanceYears,currentRows,yearRanges,neighbours,searchNodes} from '../src/temporalModel.js';

// A small fixture tests graph rules; published research data is loaded separately.
const fixture={
  nodes:[
    {id:'a',label:'Latest A',profiles:[{year:2003,label:'Earlier A',home_region:'US'},{year:2004,label:'Later A',home_region:'US'}]},
    {id:'b',profiles:[{year:2003,label:'B'},{year:2004,label:'B'}]},
    {id:'c',profiles:[{year:2003,label:'C'}]},
    {id:'d',profiles:[{year:2004,label:'D'}]},
  ],
  edges:[{id:'ab',source:'a',target:'b',weight:1},{id:'bc',source:'b',target:'c',weight:1},{id:'db',source:'d',target:'b',weight:1}],
  frames:[{year:2003,node_ids:['a','b','c'],edge_ids:['ab','bc']},{year:2004,node_ids:['a','b','d'],edge_ids:['ab','db']}],
};

test('annual changes use the preceding data year and preserve directed edges',()=>{
  const view=frameView(prepareBundle(fixture),2004);
  assert.equal(view.previousYear,2003);
  assert.deepEqual([...view.addedNodes],['d']);assert.deepEqual([...view.removedNodes],['c']);
  assert.deepEqual([...view.addedEdges],['db']);assert.deepEqual([...view.removedEdges],['bc']);
  assert.deepEqual(view.counts,{nodes:3,edges:2,addedNodes:1,removedNodes:1,addedEdges:1,removedEdges:1});
});
test('focus upstream/downstream filters recalculate changes in the same direction',()=>{
  const model=prepareBundle(fixture),up=frameView(model,2004,'b','upstream'),down=frameView(model,2004,'b','downstream');
  assert.deepEqual(new Set(up.edgeIds),new Set(['ab','db']));assert.equal(up.counts.removedNodes,0);
  assert.deepEqual([...down.nodeIds],['b']);assert.equal(down.counts.edges,0);assert.equal(down.counts.removedNodes,1);
});
test('lean profiles select the exact historical year and retain unknown fields',()=>{
  const model=prepareBundle(fixture);
  assert.equal(stateAt(model,'a',2003).label,'Earlier A');assert.equal(stateAt(model,'a',2004).label,'Later A');
  assert.equal(stateAt(model,'c',2004).present,false);assert.equal(stateAt(model,'c',2004).observed_year,2003);
  const raw=structuredClone(fixture);raw.nodes[0].profiles=[];
  assert.equal(stateAt(prepareBundle(raw),'a',2003).label,'企业 a');
});
test('appearance years follow visible network membership rather than company profiles',()=>{
  const model=prepareBundle(fixture);
  assert.deepEqual(appearanceYears(model,'c'),[2003]);assert.deepEqual(appearanceYears(model,'c','b','upstream'),[]);
  assert.equal(yearRanges([2003,2004,2005,2007,2009,2010]),'2003—2005、2007、2009—2010');
});
test('coordinates preserve real zeroes, skip missing values and export only the current frame',()=>{
  const layout=preparePositions({positions:[{id:'a',x:0,y:0},{id:'b',x:3,y:4},{id:'c',x:null,y:2}]}),model=prepareBundle(fixture);
  assert.equal(layout.positions.get('a').x,0);assert.equal(layout.positions.has('c'),false);
  assert.deepEqual(preparePositions({nodes:[{id:'a',x:0,y:0}]}).positions.get('a'),{id:'a',x:0,y:0});
  const rows=currentRows(model,frameView(model,2004),layout.positions);
  assert.deepEqual(new Set(rows.nodes.map(n=>n.id)),new Set(['a','b','d']));assert.equal(rows.nodes.find(n=>n.id==='d').x,'');
  assert.equal(rows.edges.find(e=>e.id==='ab').source_label,'Later A');assert.equal(rows.nodes.some(n=>n.id==='c'),false);
});
test('missing edge endpoints fail validation',()=>{
  const raw=structuredClone(fixture);raw.frames[0].node_ids=['a','b'];
  assert.throws(()=>prepareBundle(raw),/关系端点缺失/);
});
test('focus CSV appearance years use the selected direction',()=>{
  const raw={nodes:[{id:'a',profiles:[{year:2003,label:'A'},{year:2004,label:'A'}]},{id:'b',profiles:[{year:2003,label:'B'},{year:2004,label:'B'}]}],edges:[{id:'ab',source:'a',target:'b'},{id:'ba',source:'b',target:'a'}],frames:[{year:2003,node_ids:['a','b'],edge_ids:['ab']},{year:2004,node_ids:['a','b'],edge_ids:['ba']}]};
  const model=prepareBundle(raw),rows=currentRows(model,frameView(model,2004,'b','downstream'),new Map());
  assert.equal(rows.nodes.find(n=>n.id==='a').first_observed_year,2004);assert.equal(rows.nodes.find(n=>n.id==='a').observed_years,'2004');
});
test('node details use the edges actually shown by the direction filter',()=>{
  const model=prepareBundle(fixture),view=frameView(model,2003,'b','upstream'),rows=neighbours(model,'b',2003,view.edgeIds);
  assert.deepEqual(rows.suppliers.map(n=>n.id),['a']);assert.deepEqual(rows.customers,[]);
  assert.deepEqual(neighbours(model,'b',2003).customers.map(n=>n.id),['c']);
});
test('exact Revere ID search outranks partial ID and name matches',()=>{
  const raw=structuredClone(fixture);raw.nodes.unshift({id:'x-a',label:'A',profiles:[{year:2004,label:'A'}]});raw.frames[1].node_ids.unshift('x-a');
  assert.equal(searchNodes(prepareBundle(raw),'a',2004)[0].id,'a');
});
