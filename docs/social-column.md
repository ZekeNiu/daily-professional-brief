# 科学期刊与社媒热点

主站与每个日期页共用两个栏目：默认显示科学期刊，`?channel=social`显示社媒热点。两者使用同一页面模板、样式、日期选择和内容卡片。归档页按同一参数保留栏目。

## 阅读结构

紧凑标题与日期导航之后，两栏均按“近期趋势 → 本期摘要 → 每日资讯/当日热点”排列。趋势按运动表现、运动健康、AI三个领域切换，每个领域有独立的多主题热力图。展示名称“运动表现”对应既有数据字段“运动科学”，内部JSON、源清单与归档键保持一致。

2026-10-20起，领域内部的热力图议题由每日AI编辑任务从完整当期记录归纳，不再由固定关键词分类决定。议题名称、成员和一句要点保存在`data/topic-analysis/YYYY-MM-DD.json`，同一议题跨日沿用稳定ID。默认显示所选日期内的三个主要议题，更多议题及其他已收录内容可展开。社媒格值为同一议题同一天的不同来源数，期刊格值为当天去重收录条目数；最右列为整个区间的不同来源数/去重条目数。按所选范围重新计算汇总，不能相加每日来源数来计算区间不同来源数。具体生成流程与格式见[每日AI议题归纳](ai-trend-topics.md)。

日期下拉支持快捷范围和自定义起止日。期刊当前提供7/14/30天，社媒按已生成快照提供7/14天；自定义区间限于该期快照的start/end。桌面默认14天，手机默认7天。较长区间可在图内横向滚动。领域与日期偏好按栏目、当期日期保存；分享链接保存field、from、to、topic、day，切换栏目清除跨栏的筛选参数。

点选议题后，下方唯一详情区显示该范围的具体内容；归纳的引用全部处于所选范围时，同时显示一句AI要点与置信度。点选图格仅显示该日内容。日期变化同步过滤已打开的详情，领域变化关闭上一领域的详情。来源日期、原文链接可逐条核对。旧direction及分类链接映射到所属领域的相关议题。

摘要保留本期核心信号，逐条速览默认折叠；每日资讯与领域列表默认展开，单篇详情默认折叠。资讯卡片使用中文短标题，完整原题保留于详情中。各区可独立折叠并保存偏好；新一期每日资讯默认展开。来源清单、专业判断默认折叠。

## 数据

- `data/YYYY-MM-DD.json`：原有科学期刊日报。
- `data/social/YYYY-MM-DD.json`：社媒热点，保留同样的summary、items、section_notes与professional_judgment；每条增加author、platform、published_date，可附references与confidence_reason。
- `data/social/collection.json`：最新公开RSS/Atom采集结果与连接状态。
- `data/social/manual-signals.json`：已核查的公开社交帖子元数据。保存原始链接、真实发布日期与核查时间。
- `data/social/publication-checks.json`：原网页日期核查或排除记录，用于处理只含updated的订阅条目等情况。
- `data/social/observations.json`：滚动45天的已收集条目，保留首次观察时间。
- `data/social/trends/YYYY-MM-DD.json`：按当期截止时间生成的14天话题数据，历史日期不引入其截止时间后才发现的内容。
- `data/trends/YYYY-MM-DD.json`：近30天科学期刊及官方发布的去重收录记录，以简报收录日为日期，避免将收录日误作论文发表日。
- `data/social/sources.json`、`latest.json`与`archive.json`由脚本生成。

两个栏目的当日JSON可编辑`trend_directions`（建议2–4个具体方向）。每个方向包含`id`、`domain`、`title`、`change`（简短的近期变化）、`meaning`（连读重点）、`confidence`（高/中/低/未知）、`confidence_reason`和`references`。每条引用包含`url`、`label`、`note`；期刊引用还填写`edition_date`以定位既有简报。至少引用两条不同原始内容，引用须位于该期时间窗内且属于相同领域。持续转载或同一旧文的多次分享不能充当多个独立进展。

可选`related`包含`channel`（journal/social）、`direction_id`与`label`，链接当期另一栏目的相关方向。示例见两个栏目的`2026-10-19.json`。`scripts/build_trends.py`解析引用、核对时间窗并生成趋势快照。编辑综合与来源事实分别呈现，不从分类计数自动推断讨论增长。没有编辑方向的旧归档仅展示当时已收录内容的阅读线索，不补写回溯性判断。

趋势图按已收集条目的发布日期展示每日话题涉及的来源数：一个来源在同一话题同一天最多计一次。原文URL与DOI用于合并，更新日期不自动当作新发表；只含updated的条目经人工日期核查后才计入时间图。图格可展开对应内容。没有全平台发帖总量、互动量或增长率的推定。

## 每日更新

`Collect public social sources`在北京时间07:15对应的UTC时段发起每日采集，也可手动运行。公开网页与X、Bluesky、LinkedIn、YouTube、播客、微信公众号和社区入口，由日报编辑任务按选题检索核查；列入清单的入口与实际读通的订阅源分别记录。

每日07:50的既有日报任务同时编辑两个栏目，分别去重和核对原始来源；写入两个当日JSON，再由Pages工作流统一生成导航、趋势与归档。来源异常按实际状态保存，正文聚焦当期内容。

```bash
python3 scripts/collect_social.py --output data/social/collection.json
python3 scripts/sync_briefs.py
python3 scripts/check_social.py
```

## 回退

整合前备份为`backup/pre-integrated-social-20261019-1408`，基准提交`db646918dbbae023ed139efd6dcd8c6661493e26`。按整合发布提交执行`git revert`可回退本轮站点变更，保留之后的新日报。每日任务的整合前完整配置已单独保存。

趋势与阅读层级调整前备份为`backup/pre-trend-redesign-20261019`，基准提交`cae793cdbe3d3c1fdab833e66cfe1a5db37ae3f1`。调整作为独立发布提交保存，可使用`git revert`回退并保留后续日报内容。

图表优先版本的备份为`backup/pre-visual-trends-20261019`，基准提交`b508606659c768c3cf8beccb028950e83d15361c`。

分领域热力图调整前备份为`backup/pre-domain-heatmap-20261019`，基准提交`27dccb1a5f98f6b34d7ecd4128a2a829f55893a2`。

本轮发布前的最新备份为`backup/pre-domain-heatmap-20261020`，基准提交`ff2b436ea709125667dc0f0e4b0d113ddae63987`，包含10月20日两个栏目的日报数据。

AI动态议题发布前备份为`backup/pre-ai-topics-20261020`，基准提交`84bef543ccebe4e297dbeb7a83e8bedf3dbf5c0b`。每日任务配置另存备份；发布提交可单独回退。
