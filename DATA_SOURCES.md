# 数据来源与口径

## 商品贸易：CEPII BACI

贸易数据来自[CEPII BACI](https://www.cepii.fr/CEPII/en/bdd_modele/bdd_modele_item.asp?id=37)，版本`BACI HS17 V202601`，年度2017—2024。原始字段`v`以当年千美元计，网页中的`value_usd`为按有向出口方和进口方汇总后乘1000的美元金额。

商品目录含60个独立HS6：OECD半导体价值链映射中的59码，加研究补充的氟化氢HS281111。11类共69个可选视图，其中9个是明确列示HS6集合的环节合计。合计与子项保留包含关系。

目录依据包括：

- [OECD, Mapping the Semiconductor Value Chain (2025), Annex D](https://www.oecd.org/content/dam/oecd/en/publications/reports/2025/06/mapping-the-semiconductor-value-chain_5ba52971/4154cdbf-en.pdf)。
- [WCO HS2017第28章](https://www.wcoomd.org/-/media/wco/public/global/pdf/topics/nomenclature/instruments-and-tools/hs-nomenclature-2017/2017/0628_2017e.pdf?la=en)：氟化氢商品原名与编码。

每个商品的HS6集合、原始名称、范围说明、OECD表号和来源链接保存在`public/data/index.json`及各年度文件的`metadata.product_definition`。商品范围表为`public/data/研究商品范围.csv`。BACI数据归CEPII及其来源机构，目录保留来源版本和文件摘要。

HS854140包含光敏半导体器件、光伏电池及LED；HS370790按其他摄影用化学制剂完整商品范围统计。数量字段以吨计，具体可用性由`quantity_defined`标明。HS8542的数量字段保留null。

## 地图：Natural Earth

`world.geojson`及经济体代表点来自Natural Earth 1:50m admin-0数据，使用的版本提交为`ca96624a56bd078437bca8184e78163e5039ad19`。坐标来源与地理匹配状态保存在每份数据的metadata和经济体记录中。

Natural Earth将其栅格与矢量地图数据置于公共领域，见[官方使用条款](https://www.naturalearthdata.com/about/terms-of-use/)。地球底图使用Cesium官方包内随附的NaturalEarthII瓦片。

BACI代码490保留原标签`Other Asia, nes`，页面按现有研究口径使用中国台湾代表点和展示名，映射依据见[UN Comtrade编码说明](https://uncomtrade.org/docs/taiwan-province-of-china-trade-data/)。原代码和原标签保留在JSON中。

## 企业供货关系：FactSet

企业页保存FactSet关系整理成果的Gephi原生图和工程：2025-12-31快照，共339家公司、691条有向供方→客户关系。它由原146家公司、330条关系与2026-10-28补充名录中的可识别企业组成，新增193家公司、361条关系。

关系按2025-12-31有效的半开区间`[start,end)`抽取，两端均在扩样名单内；每条边表示一个观察到供货关系的企业对，权重为1。2026名录的分类观察日期与2025关系快照分别保留。FactSet关系数据归FactSet及相关来源方；本项目保存的图和工程由该研究样本生成。

## 程序库与许可

CesiumJS来自官方[CesiumGS/cesium](https://github.com/CesiumGS/cesium)，采用Apache-2.0许可证。其原始许可文本与第三方清单位于`public/licenses/`，安装后生成的`public/cesium/`保留官方资产布局。其他npm依赖的许可证随各依赖安装包保存。

本项目的研究整理成果、来源数据和第三方组件分别保留各自归属。仓库中的第三方许可证对应其指定组件。
