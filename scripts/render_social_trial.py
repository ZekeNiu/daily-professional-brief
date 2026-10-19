"""Render the source-backed, static social trial preview."""
from __future__ import annotations
import argparse
import hashlib
import html
import json
from pathlib import Path
from urllib.parse import urlsplit

ROOT = Path(__file__).resolve().parents[1]
TRIAL = ROOT / 'trials/social/2026-10-19'
OUTPUT = ROOT / 'labs/social/2026-10-19/index.html'
h = lambda v: html.escape(str(v), quote=True)


def links(sources):
    out = []
    for source in sources:
        if urlsplit(source['url']).scheme != 'https':
            raise ValueError('Source URLs must use HTTPS')
        out.append(f'<a href="{h(source["url"])}" target="_blank" rel="noopener noreferrer">{h(source["label"])} ↗</a>')
    return ''.join(out)


CSS = r'''
:root{--ink:#18332c;--muted:#63766d;--green:#25634c;--line:#dce6df;--paper:#f4f7f1;--white:#fff;--mint:#e9f1e8;--orange:#885f33;--violet:#61566f}*{box-sizing:border-box}html{scroll-behavior:smooth;scroll-padding-top:85px}body{margin:0;color:var(--ink);font-family:Inter,"Noto Sans SC","Microsoft YaHei",system-ui,sans-serif;background:var(--paper);line-height:1.75}a{color:var(--green);text-decoration:none}a:hover{text-decoration:underline}button,input{font:inherit}button{cursor:pointer}header{position:sticky;top:0;z-index:10;background:rgba(244,247,241,.94);border-bottom:1px solid var(--line);backdrop-filter:blur(16px)}.nav{max-width:1180px;margin:auto;padding:15px 28px;display:flex;align-items:center;justify-content:space-between;gap:24px}.brand{font-size:13px;letter-spacing:.08em;font-weight:750;color:var(--ink);white-space:nowrap}.navlinks{display:flex;gap:23px;font-size:13px}.wrap{max-width:1180px;margin:auto;padding:0 28px 55px}.hero{display:grid;grid-template-columns:1.3fr 1fr;gap:64px;align-items:center;padding:56px 0 35px}.eyebrow{color:var(--green);font-size:12px;letter-spacing:.13em;font-weight:700;text-transform:uppercase}.edition{display:inline-flex;border:1px solid #c9d7ca;border-radius:30px;padding:2px 10px;letter-spacing:0;margin-left:10px;font-size:11px}.hero h1{font-size:clamp(35px,4.5vw,55px);letter-spacing:-.035em;line-height:1.2;margin:16px 0 20px;font-weight:680}.hero p{color:var(--muted);margin:0;max-width:600px;font-size:15px}.heroaside{background:#e5eee2;padding:26px 28px;border-radius:20px;border:1px solid #d5e1d2}.heroaside b{display:block;font-size:20px;font-weight:620;margin:4px 0 12px}.heroaside p{font-size:13px;line-height:1.9}.stats{display:grid;grid-template-columns:repeat(4,1fr);border:1px solid var(--line);background:#fff;border-radius:16px;margin:0 0 42px;overflow:hidden}.stat{padding:18px 24px;border-right:1px solid var(--line)}.stat:last-child{border:0}.stat strong{font-size:32px;font-weight:600;line-height:1.3;font-variant-numeric:tabular-nums}.stat span{display:block;font-size:12px;color:var(--muted)}.sectionhead{display:flex;justify-content:space-between;gap:18px;align-items:baseline;margin:34px 0 18px}.sectionhead h2{font-size:23px;margin:0;font-weight:650;letter-spacing:-.02em}.sectionhead p{font-size:12px;color:var(--muted);margin:0}.toolbar{display:flex;justify-content:space-between;gap:16px;margin-bottom:18px}.filters{display:flex;gap:7px;flex-wrap:wrap}.filter{font-size:12px;background:transparent;border:1px solid #ccd9cf;border-radius:30px;padding:7px 15px;color:var(--muted)}.filter.active{background:var(--ink);border-color:var(--ink);color:white}.search{border:1px solid #ccd9cf;border-radius:10px;background:#fff;padding:7px 13px;font-size:12px;width:240px;max-width:100%;color:var(--ink)}.cards{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:18px}.signal{background:#fff;border:1px solid var(--line);border-radius:16px;padding:24px;display:flex;flex-direction:column;min-width:0}.meta{display:flex;align-items:center;justify-content:space-between;gap:10px;font-size:11px;color:var(--muted);margin-bottom:11px}.tag{display:inline-flex;align-items:center;gap:6px;color:var(--green)}.tag::before{content:"";width:6px;height:6px;background:currentColor;border-radius:50%}.signal[data-domain="运动健康"] .tag{color:var(--orange)}.signal[data-domain="AI"] .tag{color:var(--violet)}.signal h3{font-size:20px;line-height:1.5;letter-spacing:-.02em;margin:2px 0 10px;font-weight:650}.byline{font-size:11px;color:var(--muted);padding-bottom:14px;margin-bottom:15px;border-bottom:1px solid #edf1ed}.signal p{font-size:13px;line-height:1.85;margin:0 0 15px;color:#40594e}.takeaway{background:#f0f5ed;border-left:2px solid #93b598;padding:11px 13px;border-radius:0 8px 8px 0;margin:0 0 16px}.takeaway strong{font-size:11px;color:#31553d;display:block;margin-bottom:3px}.takeaway p{font-size:12px;margin:0}.context{font-size:11px!important;color:var(--muted)!important}.cardfoot{margin-top:auto}.sources{display:flex;flex-wrap:wrap;gap:14px;font-size:11px;padding-top:12px;border-top:1px solid #edf1ed}.certainty{font-size:10px;color:var(--muted);margin-bottom:8px}.topicgrid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:18px}.topic{border:1px solid #d3dfd2;background:#eaf1e6;border-radius:15px;padding:23px}.topic h3{font-size:18px;margin:7px 0 10px;font-weight:640}.topic p{font-size:13px;color:#466050;margin:0 0 12px}.topic small{font-size:11px;color:var(--muted)}.topic a{font-size:11px;margin-right:13px}.baseline{font-size:12px;color:var(--muted);margin:14px 0 26px}.listen{background:#fff;border:1px solid var(--line);padding:18px 22px;border-radius:12px;margin:18px 0 30px;font-size:12px}.listen b{font-size:14px;display:block;margin:4px 0}.listen p{color:var(--muted);margin:4px 0}.panel{border:1px solid var(--line);background:#fff;border-radius:14px;margin:14px 0;overflow:hidden}.panel>summary{padding:18px 22px;cursor:pointer;font-size:14px;font-weight:600;display:flex;justify-content:space-between;gap:15px;list-style:none}.panel>summary::after{content:"＋";font-weight:400;color:var(--green)}.panel[open]>summary::after{content:"−"}.panel>summary::-webkit-details-marker{display:none}.panelbody{padding:0 22px 20px}.panelbody p{font-size:12px;color:var(--muted)}.tablewrap{overflow:auto;max-width:100%}table{border-collapse:collapse;width:100%;font-size:11px;line-height:1.7}th{text-align:left;color:var(--muted);font-weight:500;padding:11px 10px;border-bottom:1px solid var(--line);white-space:nowrap}td{padding:12px 10px;border-bottom:1px solid #edf1ed;vertical-align:top}tr:last-child td{border-bottom:0}.authorname{font-weight:650;white-space:nowrap}.subtle{color:var(--muted);font-size:10px}.resultgood{color:var(--green)}.resultwait{color:var(--orange)}.queue{display:grid;gap:10px}.queueitem{border-bottom:1px solid #edf1ed;padding:12px 0;font-size:12px}.queueitem:last-child{border:0}.queueitem p{margin:4px 0}.empty{padding:35px;text-align:center;border:1px dashed var(--line);border-radius:14px;color:var(--muted);font-size:13px}.hidden{display:none!important}.verdict{margin:35px 0 28px;border-top:1px solid #cbd9c9;padding-top:24px}.verdict b{font-size:17px;font-weight:650}.verdict p{font-size:13px;color:var(--muted);max-width:850px}footer{border-top:1px solid var(--line);padding-top:18px;display:flex;justify-content:space-between;gap:14px;font-size:11px;color:var(--muted)}footer a{margin-left:16px}button:focus-visible,a:focus-visible,input:focus-visible,summary:focus-visible{outline:2px solid #629270;outline-offset:3px}@media(max-width:760px){.nav{padding:13px 18px}.navlinks{gap:12px;font-size:11px}.navlinks a:nth-child(2){display:none}.wrap{padding:0 18px 35px}.hero{grid-template-columns:1fr;gap:22px;padding:34px 0 24px}.hero h1{font-size:38px}.heroaside{padding:18px 20px}.heroaside b{font-size:18px}.stats{margin-bottom:28px}.stat{padding:14px 12px}.stat strong{font-size:27px}.stat span{font-size:10px}.cards,.topicgrid{grid-template-columns:1fr}.signal{padding:21px}.toolbar{flex-direction:column;gap:12px}.search{width:100%}.sectionhead{align-items:flex-start;flex-direction:column;gap:3px}.sectionhead h2{font-size:22px}.panel>summary{padding:16px}.panelbody{padding:0 16px 16px}footer{flex-direction:column}footer a{margin:0 16px 0 0}}
'''

JS = r'''
(()=>{let filter='全部',query='';const cards=[...document.querySelectorAll('.signal')];const apply=()=>{let n=0;cards.forEach(c=>{const ok=(filter==='全部'||c.dataset.domain===filter||(filter==='X'&&c.dataset.channel==='X'))&&(!query||c.dataset.search.includes(query));c.classList.toggle('hidden',!ok);if(ok)n++});document.querySelector('#filterCount').textContent=n+' 条内容';document.querySelector('#empty').classList.toggle('hidden',n!==0)};document.querySelectorAll('[data-filter]').forEach(b=>b.addEventListener('click',()=>{filter=b.dataset.filter;document.querySelectorAll('[data-filter]').forEach(x=>{x.classList.toggle('active',x===b);x.setAttribute('aria-pressed',String(x===b))});apply()}));document.querySelector('#signalSearch').addEventListener('input',e=>{query=e.target.value.trim().toLowerCase();apply()});document.querySelector('#sourceSearch').addEventListener('input',e=>{const q=e.target.value.trim().toLowerCase();document.querySelectorAll('#sourceRows tr').forEach(tr=>tr.classList.toggle('hidden',!tr.dataset.search.includes(q)))});document.body.dataset.ready='true';})();
'''


def render() -> str:
    collection = json.loads((TRIAL / 'collection.json').read_text())
    report = json.loads((TRIAL / 'curated.json').read_text())
    browser = json.loads((TRIAL / 'browser-checks.json').read_text())
    stats = collection['summary']
    candidates = {i['id']: i for i in collection['candidates']}
    candidate_count = len(candidates)
    simon_count = sum(i['author_id'] == 'simon-willison' for i in candidates.values())
    previous_count = sum(bool(i['previous_briefs']) for i in candidates.values())
    authors = {a['id']: a for a in collection['authors']}
    assert len(authors) == 24 and stats['feeds_read'] == sum(a['status'] == 'feed_ok' for a in authors.values())
    ids = {i['id'] for i in report['items']}
    assert len(ids) == len(report['items'])
    for item in report['items']:
        if item.get('candidate_id'):
            assert item['candidate_id'] in candidates
        if item.get('browser_post_id'):
            assert item['browser_post_id'] in {p['id'] for p in browser['posts']}
    for topic in report['topics']:
        assert set(topic['item_ids']) <= ids
    cards = []
    for item in report['items']:
        search = h(' '.join(str(v) for v in item.values()).lower())
        context = f'<p class="context">{h(item["context"])}</p>' if item.get('context') else ''
        cards.append(f'''<article class="signal" id="{h(item['id'])}" data-domain="{h(item['domain'])}" data-channel="{h(item['channel'])}" data-search="{search}">
<div class="meta"><span class="tag">{h(item['domain'])} · {h(item['kind'])}</span><time>{h(item['date'][5:])}</time></div>
<h3>{h(item['title'])}</h3><div class="byline">{h(item['author'])}　·　{h(item['channel'])}　·　{h(item['priority'])}</div>
<p>{h(item['what'])}</p><div class="takeaway"><strong>对实践的意义</strong><p>{h(item['takeaway'])}</p></div>{context}
<div class="cardfoot"><div class="certainty">置信度：{h(item['confidence'])} · {h(item['basis'])}</div><div class="sources">{links(item['sources'])}</div></div></article>''')
    topics = []
    by_id = {i['id']: i for i in report['items']}
    for topic in report['topics']:
        source_links = links([{'label': by_id[i]['author'].split('／')[0], 'url': by_id[i]['sources'][0]['url']} for i in topic['item_ids']])
        topics.append(f'<article class="topic"><small>本轮归纳 · {topic["authors"]} 位入组作者 · {len(topic["item_ids"])} 条内容</small><h3>{h(topic["title"])}</h3><p>{h(topic["summary"])}</p>{source_links}</article>')
    profiles = {p['author_id']: p for p in browser['profiles']}
    rows = []
    for a in authors.values():
        status = '订阅可用' if a['status'] == 'feed_ok' else '待补订阅入口' if a['homepage_read'] else '本轮访问未成功'
        feed_link = links([{'label': '订阅源', 'url': a['feed_url']}]) if a['feed_url'] else '—'
        x = profiles.get(a['id'])
        x_text = h(x['result']) if x else '本轮未查 X'
        x_url = links([{'label': 'X 页面', 'url': x['url']}]) if x else ''
        rows.append(f'<tr data-search="{h((a["name"]+a["domain"]+a["focus"]).lower())}"><td><a class="authorname" href="{h(a["homepage"])}" target="_blank" rel="noopener noreferrer">{h(a["name"])}</a><div class="subtle">{h(a["focus"])}</div></td><td>{h(a["domain"])}</td><td class="{"resultgood" if a["status"]=="feed_ok" else "resultwait"}">{status}<div>{feed_link}</div></td><td>{len(a["recent_item_ids"])}</td><td>{x_text}<div>{x_url}</div></td></tr>')
    decisions = {i['candidate_id']: i for i in report['triage']}
    labels = {'selected':'精选','listening':'收听清单','already_reported':'历史已报','not_selected':'本轮未选'}
    candidates_html = []
    for item in collection['candidates']:
        triage = decisions[item['id']]
        candidates_html.append(f'<tr><td>{h(item["published_at"][:10])}</td><td>{h(item["source_author"])}</td><td><a href="{h(item["url"])}" target="_blank" rel="noopener noreferrer">{h(item["title"])}</a></td><td>{labels[triage["decision"]]}<div class="subtle">{h(triage["reason"])}</div></td></tr>')
    research_leads = [p for p in browser['posts'] if p['disposition'] == 'verify_primary_study']
    queue = ''.join(f'<div class="queueitem"><b>{h(p["author"])} · {h(p["published_at"][:10])}</b><div>{links([{"label":p["title"],"url":p["url"]}])}</div><p>原帖已读取，下一步追溯配图与原始研究。</p></div>' for p in research_leads)
    listening = ''.join(f'<div class="listen"><span class="eyebrow">收听清单 · {h(i["date"])}</span><b>{links([{"label":i["title"],"url":i["url"]}])}</b><p>{h(i["author"])} · {h(i["description"])} · {h(i["evidence"])}</p></div>' for i in report['listening'])
    backup = 'https://github.com/ZekeNiu/daily-professional-brief/tree/backup/pre-social-trial-20261019-1332'
    return f'''<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#f4f7f1"><title>{h(report['title'])}｜2026-10-19</title><style>{CSS}</style></head><body>
<header><nav class="nav"><a class="brand" href="../../../">PROFESSIONAL BRIEF</a><div class="navlinks"><a href="#signals">精选动态</a><a href="#topics">讨论主题</a><a href="#coverage">来源覆盖</a><a href="../../../">返回简报 ↗</a></div></nav></header>
<main class="wrap"><section class="hero"><div><div class="eyebrow">2026.10.19 <span class="edition">{h(report['edition'])}</span></div><h1>社媒与作者观察</h1><p>{h(report['summary'])}</p></div><div class="heroaside"><span class="eyebrow">本轮发现</span><b>无需购买 X API，<br>已读到原帖与有价值的讨论。</b><p>订阅源自动发现内容，浏览器核查补足上下文。<br>观察窗口：10月5日—19日，精选保留原始日期。</p></div></section>
<section class="stats" aria-label="试跑概况"><div class="stat"><strong>{stats['authors_total']}</strong><span>入组作者 · 三个领域</span></div><div class="stat"><strong>{stats['feeds_read']}</strong><span>公开订阅源读通</span></div><div class="stat"><strong>{len(profiles)}</strong><span>作者 X 页面核查</span></div><div class="stat"><strong>{len(report['items'])}</strong><span>本轮精选内容</span></div></section>
<section id="signals"><div class="sectionhead"><h2>值得展开的动态</h2><p id="filterCount">{len(report['items'])} 条内容</p></div><div class="toolbar"><div class="filters">{''.join(f'<button class="filter {"active" if f=="全部" else ""}" data-filter="{f}" aria-pressed="{"true" if f=="全部" else "false"}">{f}</button>' for f in ['全部','运动科学','运动健康','AI','X'])}</div><input id="signalSearch" class="search" type="search" aria-label="搜索精选内容" placeholder="搜索作者、主题或工具…"></div><div class="cards">{''.join(cards)}</div><div id="empty" class="empty hidden">当前筛选下没有精选内容。</div></section>
<section id="topics"><div class="sectionhead"><h2>本次讨论主题</h2><p>从已核查内容归纳</p></div><div class="topicgrid">{''.join(topics)}</div><p class="baseline">{h(report['baseline_note'])}</p></section>{listening}
<section id="coverage"><div class="sectionhead"><h2>采集与筛选记录</h2><p>保留每个来源的实际结果</p></div><details class="panel"><summary>24 位作者 · 来源覆盖</summary><div class="panelbody"><p>运动科学、运动健康、AI各8位。订阅源可用与作者有近期更新分别记录；X栏为本次按需核查的结果。</p><input id="sourceSearch" class="search" type="search" aria-label="搜索作者名单" placeholder="搜索作者或领域…"><div class="tablewrap"><table><thead><tr><th>作者与方向</th><th>领域</th><th>订阅结果</th><th>窗口内条目</th><th>X 核查</th></tr></thead><tbody id="sourceRows">{''.join(rows)}</tbody></table></div></div></details>
<details class="panel"><summary>{candidate_count} 条订阅候选 · 查看筛选记录</summary><div class="panelbody"><p>其中{simon_count}条来自Simon Willison；保留有价值的实践内容，小版本修补与个人演示不单列推送。{previous_count}条原研究与历史简报匹配，已识别。</p><div class="tablewrap"><table><thead><tr><th>发布日期</th><th>发现作者</th><th>原始入口</th><th>本轮处理</th></tr></thead><tbody>{''.join(candidates_html)}</tbody></table></div></div></details>
<details class="panel"><summary>3 条 X 研究线索 · 待追溯原始研究</summary><div class="panelbody queue">{queue}</div></details>
<details class="panel"><summary>2 条旧文重推 · 已追溯内容日期</summary><div class="panelbody"><p>Asker Jeukendrup的两条近期帖子指向9月22日与9月27日的既有文章。此次记录其传播动态，未将其作为新研究重复收录。</p>{''.join(f'<div class="queueitem">{links([{"label":p["title"]+" · X 原帖","url":p["url"]},{"label":"对应文章","url":p["context_url"]}])}</div>' for p in browser['posts'] if p['disposition']=='older_content_reshared')}</div></details></section>
<section class="verdict"><b>试跑结论</b><p>{h(report['run_verdict'])}</p><p>本次为一次采集快照。现有每日简报、发送时间与邮件设置保留。</p></section>
<footer><span>2026-10-19 · 社媒与作者观察</span><span><a href="../../../trials/social/2026-10-19/README.md">方法与回退说明</a><a href="{backup}">备份分支 ↗</a><a href="../../../">返回最新简报 ↗</a></span></footer></main><script>{JS}</script></body></html>'''


if __name__ == '__main__':
    parser = argparse.ArgumentParser();parser.add_argument('--check', action='store_true');args = parser.parse_args()
    content = render() + '\n'
    if args.check:
        if not OUTPUT.exists() or OUTPUT.read_text() != content:
            raise SystemExit('Trial preview is out of sync with its data')
        print('PASS: trial preview matches source data; internal item references are valid')
    else:
        OUTPUT.parent.mkdir(parents=True, exist_ok=True);OUTPUT.write_text(content)
        print(OUTPUT.relative_to(ROOT))
