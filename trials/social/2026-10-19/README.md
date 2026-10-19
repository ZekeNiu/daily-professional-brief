# 社媒与作者观察 · 2026-10-19

社媒栏目已并入主站：`/briefs/2026-10-19/?channel=social`。本文保留首轮试跑记录；日常更新以`docs/social-column.md`为准，旧预览地址跳转到统一页面。

本次使用24位作者的公开博客与订阅源，并按需核查5位作者的X页面。观察窗口为2026年10月5日13:32至10月19日13:32（北京时间）。

## 实际结果

- 16个公开订阅源读取成功，取得35条窗口内候选。
- 浏览器核查取得6条近期X帖子；其中1条进入精选，3条保留为研究线索，2条追溯为9月旧文重推。
- 精选6条，另列1个收听候选，归纳2个本轮讨论主题。
- 订阅候选中30条来自Simon Willison。精选经过人工核查；页面上的主题数量不是全平台热度统计。

## 文件与来源

- `collection.json`：第二轮真实RSS/Atom采集结果，包含每次请求、发布日期、原始URL、DOI匹配与历史简报匹配。
- `collection-round-1.json`：首轮结果；后续修正了HTTP订阅链接与较大订阅文件的处理。
- `browser-checks.json`：本轮公开X帖子与页面核查记录。
- `curated.json`：精选、主题、收听清单及全部订阅候选的处理结果。
- `config/social-sources.json`：作者名单与采集窗口。
- `scripts/collect_social.py`：公开订阅源采集器，使用Python标准库。
- `scripts/render_social_trial.py`：由数据生成预览页面。

原始帖子和文章保留直达链接。近期转发旧文按原内容日期处理；同一研究优先按DOI或规范化URL与历史简报核对。补充解读说明此前报道与此次新增内容。X配图中尚未追溯的研究不作为研究结论推送。

首轮主题作为观察基线保存。后续要比较趋势，应沿用相同来源集合与时间窗口，并记录新增独立作者和持续天数。

## 运行与验证

采集仅在独立试跑分支触发或手动运行，没有新增定时任务。

```bash
python3 scripts/collect_social.py
python3 scripts/render_social_trial.py
python3 scripts/render_social_trial.py --check
```

配置中的`as_of`为此次快照的截止时间。再次试跑时先设置新的截止时间，并按新候选重新核查精选。

`Check social trial preview`验证数据与页面一致性、领域筛选、X筛选、作者搜索、24位作者名单及桌面/手机宽度，保留Chrome截图。

## 备份与回退

修改前站点完整保存在分支：

`backup/pre-social-trial-20261019-1332`

基准提交：`6b12a96108fd7eff27892a0f16450c60461ae404`

每日任务的完整配置另有独立快照。本次没有修改每日任务的提示词、时间、收件人或启用状态。

预览以独立提交发布到main，提交说明为`Publish source-backed social monitoring trial preview`。需要回退时revert该提交即可；不要把main整体重置到备份分支，以免覆盖之后新增的日报。

```bash
git log --oneline --grep='Publish source-backed social monitoring trial preview'
git revert <上一步找到的提交SHA>
git push origin main
```
