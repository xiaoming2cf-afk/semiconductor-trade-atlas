import {useEffect,useRef,useState} from 'react';
import * as C from 'cesium';
import 'cesium/Build/Cesium/Widgets/widgets.css';
import {located,nameOf,money} from './data';
import {assetUrl} from './assetUrl';

const TEAL=C.Color.fromCssColorString('#148a96'),GOLD=C.Color.fromCssColorString('#e7a14d');
function arc(a,b,isFlat){
  const start=C.Cartographic.fromDegrees(a.lon,a.lat),end=C.Cartographic.fromDegrees(b.lon,b.lat);
  const geodesic=new C.EllipsoidGeodesic(start,end);
  const height=Math.min(1.7e6,Math.max(6e4,geodesic.surfaceDistance*.12));
  const points=[];
  for(let i=0;i<=36;i++){
    const f=i/36,p=geodesic.interpolateUsingFraction(f);
    points.push(C.Cartesian3.fromRadians(p.longitude,p.latitude,isFlat?6000:6000+Math.sin(Math.PI*f)*height));
  }
  return points;
}
function fly(viewer,region,flat){
  const rects={global:[-180,-74,180,83],asia:[68,-25,153,62],usa:[-132,21,-62,56]};
  if(region==='global'&&!flat){viewer.camera.flyTo({destination:C.Cartesian3.fromDegrees(104,22,1.75e7),duration:.85});return;}
  viewer.camera.flyTo({destination:C.Rectangle.fromDegrees(...rects[region]),duration:.85});
}
export default function TradeGlobe({flows,economies,selected,onSelect,mode,region,economy,stats}){
  const host=useRef(null),viewer=useRef(null),callback=useRef(onSelect),layers=useRef(null);
  const [ready,setReady]=useState(false),[error,setError]=useState('');
  callback.current=onSelect;
  useEffect(()=>{
    let disposed=false,handler;
    try{
      C.Ion.defaultAccessToken='';
      const v=new C.Viewer(host.current,{baseLayer:false,baseLayerPicker:false,terrainProvider:new C.EllipsoidTerrainProvider(),animation:false,timeline:false,geocoder:false,homeButton:false,sceneModePicker:false,navigationHelpButton:false,fullscreenButton:false,selectionIndicator:false,infoBox:false,skyBox:false,skyAtmosphere:false,requestRenderMode:true,maximumRenderTimeChange:Infinity,contextOptions:{webgl:{alpha:false,preserveDrawingBuffer:true}}});
      viewer.current=v;
      v.scene.backgroundColor=C.Color.fromCssColorString('#e9eff1');
      v.scene.globe.baseColor=C.Color.fromCssColorString('#dfe9e8');
      v.scene.globe.enableLighting=false;
      v.scene.fog.enabled=false;
      v.scene.screenSpaceCameraController.minimumZoomDistance=8e4;
      v.scene.screenSpaceCameraController.maximumZoomDistance=4e7;
      v.camera.setView({destination:C.Cartesian3.fromDegrees(104,22,1.75e7)});
      C.TileMapServiceImageryProvider.fromUrl(assetUrl('cesium/Assets/Textures/NaturalEarthII'),{maximumLevel:2}).then(p=>{if(disposed)return;const layer=v.imageryLayers.addImageryProvider(p);layer.saturation=.45;layer.brightness=1.35;v.scene.requestRender();}).catch(e=>setError(`底图加载失败：${e.message}`));
      fetch(assetUrl('data/world.geojson')).then(r=>r.json()).then(json=>C.GeoJsonDataSource.load(json,{stroke:C.Color.fromCssColorString('#42656a').withAlpha(.5),fill:C.Color.TRANSPARENT,strokeWidth:.7})).then(ds=>{if(disposed)return;for(const e of ds.entities.values){if(e.polygon){e.polygon.fill=false;e.polygon.outline=true;e.polygon.outlineColor=C.Color.fromCssColorString('#6f8e91').withAlpha(.5);}}v.dataSources.add(ds);v.scene.requestRender();}).catch(()=>{});
      handler=new C.ScreenSpaceEventHandler(v.scene.canvas);
      handler.setInputAction(click=>{const pick=v.scene.pick(click.position);if(pick?.id?.type)callback.current(pick.id);},C.ScreenSpaceEventType.LEFT_CLICK);
      handler.setInputAction(move=>{const pick=v.scene.pick(move.endPosition);v.canvas.style.cursor=pick?.id?.type?'pointer':'grab'},C.ScreenSpaceEventType.MOUSE_MOVE);
      setReady(true);
      window.__tradeViewer=v;
    }catch(e){setError(e.message)}
    return()=>{disposed=true;handler?.destroy();if(viewer.current&&!viewer.current.isDestroyed())viewer.current.destroy();viewer.current=null;};
  },[]);
  useEffect(()=>{
    const v=viewer.current;if(!v||!ready)return;
    if(mode==='2d')v.scene.morphTo2D(0);else v.scene.morphTo3D(0);
    fly(v,region,mode==='2d');
  },[mode,region,ready]);
  useEffect(()=>{
    const v=viewer.current;if(!v||!ready)return;
    if(layers.current){for(const p of layers.current)v.scene.primitives.remove(p);}
    const lines=new C.PolylineCollection(),points=new C.PointPrimitiveCollection(),labels=new C.LabelCollection();
    layers.current=[lines,points,labels];
    const shown=new Set(),max=Math.max(...flows.map(e=>e.value_usd),1);
    const chosen=selected?.type==='edge'?selected.edge:null;
    const focus=selected?.type==='node'?selected.id:economy!=='all'?economy:null;
    for(const e of flows){
      const a=economies.get(e.source),b=economies.get(e.target);if(!located(a)||!located(b)||e.source===e.target)continue;
      shown.add(e.source);shown.add(e.target);
      const active=chosen?chosen.source===e.source&&chosen.target===e.target:focus?e.source===focus||e.target===focus:false;
      const color=active?GOLD.withAlpha(.95):TEAL.withAlpha((chosen || focus) ? 0.14 : 0.52);
      lines.add({positions:arc(a,b,mode==='2d'),width:(active?3:1.2)+Math.sqrt(e.value_usd/max)*5,material:C.Material.fromType('PolylineArrow',{color}),id:{type:'edge',edge:e}});
    }
    const ordered=[...shown].map(id=>economies.get(id)).sort((a,b)=>(b.exports_usd+b.imports_usd)-(a.exports_usd+a.imports_usd));
    ordered.forEach((n,i)=>{
      const pos=C.Cartesian3.fromDegrees(n.lon,n.lat,10000),active=focus===n.id;
      points.add({position:pos,pixelSize:active?13:5+Math.max(0,Math.log10((n.exports_usd+n.imports_usd)||1)-7)*1.2,color:active?GOLD:TEAL,outlineColor:C.Color.WHITE,outlineWidth:1.5,id:{type:'node',id:n.id}});
      if(i<13||active)labels.add({position:pos,text:nameOf(n),font:'12px "Microsoft YaHei",sans-serif',fillColor:C.Color.fromCssColorString('#183f49'),outlineColor:C.Color.WHITE,outlineWidth:3,style:C.LabelStyle.FILL_AND_OUTLINE,pixelOffset:new C.Cartesian2(0,-14),verticalOrigin:C.VerticalOrigin.BOTTOM,id:{type:'node',id:n.id}});
    });
    for(const p of layers.current)v.scene.primitives.add(p);
    v.scene.requestRender();
    window.__tradeRenderStats={flowCount:flows.length,mappedFlowCount:lines.length,nodeCount:points.length,mode};
  },[flows,economies,selected,mode,economy,ready]);
  return <div className="globe-wrap"><div ref={host} className="cesium-host"/>{error&&<div className="map-error">{error}</div>}<div className="map-status"><span className="status-dot"/>{stats.count.toLocaleString()} 条贸易流<span>·</span>{money(stats.amount)}</div><div className="map-legend"><span><i/>出口方 → 进口方</span><span><i className="selected-swatch"/>当前选择</span><small>线宽随贸易额变化</small></div></div>;
}
