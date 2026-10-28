# 芯片产业链研究地图

全球贸易与企业供货网络的本地研究应用，使用 React、Vite 和 CesiumJS。

- 贸易目录：60个独立HS6，11类，69个视图（60个单码与9个环节合计）。2017—2024年共552份数据文件。
- 企业网络：2025年末339家企业、691条供方→客户关系，展示原生Gephi导出的图和工程。

## 克隆与运行

需要 Node.js 22.12 或更新版本及 npm。

```powershell
git clone https://github.com/xiaoming2cf-afk/semiconductor-trade-atlas.git
cd semiconductor-trade-atlas
npm ci
npm run dev
```

浏览器打开 <http://127.0.0.1:5173/>。

`npm ci`按照锁文件安装固定依赖，并自动准备Cesium本地资源。`npm run dev`也会检查并复制资源。Cesium瓦片、Workers和其他运行资产均由本机提供，页面无需Cesium ion token。

在PowerShell中也可运行：

```powershell
pwsh -File ./打开研究地图.ps1
```

启动器优先寻找PATH中的Node.js和npm，并回退查找当前用户的Codex运行时。首次运行缺少依赖时执行`npm ci`；Windows服务窗口在后台运行，日志和PID保存在`.runtime/`。添加`-NoBrowser`参数可只启动服务并输出地址。

## 构建

```powershell
npm run assets
npm run build
```

`npm run assets`可单独重建`public/cesium/`。构建命令也会准备这些资产，然后生成`dist/`。

停止已有开发服务后，可预览生产构建：

```powershell
npm run preview
```

开发和预览默认绑定`127.0.0.1:5173`。`node_modules/`、`dist/`、`.runtime/`和生成的`public/cesium/`由忽略规则排除；真实贸易数据、Gephi图和工程、第三方许可证保留在仓库中。

## 使用

商品菜单按供应链环节分组，可搜索中文名称或HS编码。每次选择一个环节合计或单HS6视图，再设置年份、经济体、进出口方向和最低金额。三维地球与二维地图支持全球、亚太和美国视角；点击经济体或贸易线查看记录，可导出当前筛选CSV。

每个商品的默认金额取自目录中的`defaultThresholdUsd`。选择“显示全部”可显示全部贸易流。右侧列表按金额降序分页，地图绘制当前筛选中可定位的全部流向。

“占全球同类贸易额”＝当前筛选贸易额 / 本年所选商品的全球贸易额。经济体和方向筛选保持全球分母。环节合计与其HS6子项分别查看，各视图之间存在包含关系。

“数据范围”列出当前HS6、范围说明、HS2017和BACI原名及来源链接，并提供商品范围CSV下载。坐标金额覆盖＝当前筛选中双端坐标已知的贸易额 / 当前筛选贸易额。

企业页直接使用Gephi原生图，可缩放查看并下载PNG和`.gephi`工程。

## 数据

`public/data/index.json`登记69个视图、552份年度JSON及其SHA256。每份JSON包括：

- `year`、`product`：年份和商品视图。
- `economies`：经济体代码、中英文名称、代表点、进出口额。
- `flows`：出口方`source`、进口方`target`、贸易额`value_usd`。
- `totals`：所选商品的全球金额、边数和经济体数。
- `metadata`、`geography_unknown`：来源、单位、商品定义和未知坐标记录。

金额为当年美元，从BACI原始千美元转换。数量按元数据中有定义的吨数显示；HS8542保留`quantity_tonnes=null`。经济体点使用Natural Earth 1:50m代表点，原BACI代码与原标签保留，未知坐标保留null。

`public/enterprise/`包含企业图、Gephi工程和计数元数据。数据口径、来源和第三方许可见[DATA_SOURCES.md](DATA_SOURCES.md)。数据文件在`.gitattributes`中按原始字节保存，以保留登记的SHA256。

## 源码结构

| 路径 | 功能 |
|---|---|
| `src/App.jsx` | 数据加载、筛选和页面组合 |
| `src/Controls.jsx` | 商品、年度、经济体、方向、金额与下载 |
| `src/products.js` | 商品元数据、分类、检索与标题 |
| `src/TradeGlobe.jsx` | Cesium场景、相机、弧线、经济体点和拾取 |
| `src/Inspector.jsx` | 经济体与贸易流详情、记录列表 |
| `src/Enterprise.jsx` | 原生Gephi图缩放与下载 |
| `src/data.js` | 金额显示、中文名与CSV导出 |
| `scripts/copy-cesium.mjs` | 从安装包生成本地Cesium资源 |

商品选择由`index.products`和`index.datasets`驱动，产品ID为字符串。`group_id`和`group_name_zh`决定分类；`aggregation_level`区分合计与单码；`name_zh`、`title_zh`、`hs6_codes`、`scope_note`、`defaultThresholdUsd`和`quantity_defined`决定展示内容。

## 固定依赖

| 依赖 | 版本 |
|---|---|
| CesiumJS | 1.146.0 |
| React / ReactDOM | 19.3.1 |
| Vite | 8.3.5 |
| @vitejs/plugin-react | 6.1.2 |

完整解析版本保存在`package-lock.json`。Cesium官方仓库为[CesiumGS/cesium](https://github.com/CesiumGS/cesium)，其Apache-2.0许可证和第三方清单保留于`public/licenses/`。
