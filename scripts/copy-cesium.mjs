import { mkdirSync, existsSync, readdirSync, copyFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../', import.meta.url));
const source = resolve(root, 'node_modules/cesium/Build/Cesium');
const destination = resolve(root, 'public/cesium');
if (!existsSync(source)) throw new Error('Install the pinned local dependencies first.');
mkdirSync(destination, {recursive:true});
function copyTree(from,to) {
  mkdirSync(to,{recursive:true});
  for (const item of readdirSync(from,{withFileTypes:true})) {
    const src=resolve(from,item.name),dst=resolve(to,item.name);
    if (item.isDirectory()) copyTree(src,dst);
    else copyFileSync(src,dst);
  }
}
for (const name of ['Assets','ThirdParty','Widgets','Workers']) copyTree(resolve(source,name),resolve(destination,name));
console.log('Cesium assets copied locally.');
