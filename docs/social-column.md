# 科学期刊与社媒热点

主站与每个日期页共用两个栏目：默认显示科学期刊，`?channel=social`显示社媒热点。两者使用同一页面模板、样式、日期选择和内容卡片。归档页按同一参数保留栏目。

## 阅读结构

紧凑标题与日期导航之后，两栏均按“近期趋势 → 本期摘要 → 每日资讯/当日热点”排列。近期趋势首先展示议题时间轴：每行是一个具体方向，横轴是代表内容的日期，圆点数字表示对应的内容条数。科学期刊使用收录日期，社媒使用经核查的原始发布日期；图轴从最早的代表内容延伸到本期日期。

默认只展示图。点击议题名称，下方唯一详情区显示该方向的一句关键变化、代表来源与置信度；点击圆点，详情区聚焦该日期或日期段的原文。关闭详情或按Esc回到图。窄屏把位置接近的日期合并为一个圆点，保留准确的日期范围和全部原始条目；数字仍为真实条目数。所有圆点支持键盘聚焦、提示与点选。分类计数保留在生成数据中，主界面以具体议题作为唯一入口。

每个方向可填写`chart_label`作为图中的短标题（建议6–12字），完整`title`用于详情。图形不编码讨论增长或全平台热度。摘要保留本期核心信号，逐条速览默认折叠；每日资讯与领域列表默认展开，单篇详情默认折叠。资讯卡片使用中文短标题，完整原题保留于详情中。各区可独立折叠，按栏目保存偏好；每日资讯和领域的折叠状态还按日期保存，新一期默认展示内容。来源清单、专业判断默认折叠。

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

可选`related`包含`channel`（journal/social）、`direction_id`与`label`，链接当期另一栏目的相关方向。示例见两个栏目的`2026-10-19.json`。`scripts/build_trends.py`解析引用、核对时间窗并生成可视时间轴的数据。编辑综合与来源事实分别呈现，不从分类计数自动推断讨论增长。没有编辑方向的旧归档仅展示当时已收录内容的阅读线索，不补写回溯性判断。

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
