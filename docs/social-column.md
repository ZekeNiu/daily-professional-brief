# 科学期刊与社媒热点

主站与每个日期页共用两个栏目：默认显示科学期刊，`?channel=social`显示社媒热点。两者使用同一页面模板、样式、日期选择和内容卡片。归档页按同一参数保留栏目。

## 数据

- `data/YYYY-MM-DD.json`：原有科学期刊日报。
- `data/social/YYYY-MM-DD.json`：社媒热点，保留同样的summary、items、section_notes与professional_judgment；每条增加author、platform、published_date，可附references与confidence_reason。
- `data/social/collection.json`：最新公开RSS/Atom采集结果与连接状态。
- `data/social/manual-signals.json`：已核查的公开社交帖子元数据。保存原始链接、真实发布日期与核查时间。
- `data/social/publication-checks.json`：原网页日期核查或排除记录，用于处理只含updated的订阅条目等情况。
- `data/social/observations.json`：滚动45天的已收集条目，保留首次观察时间。
- `data/social/trends/YYYY-MM-DD.json`：按当期截止时间生成的14天话题数据，历史日期不引入其截止时间后才发现的内容。
- `data/social/sources.json`、`latest.json`与`archive.json`由脚本生成。

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
