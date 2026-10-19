"""Build the social column's source catalogue, dated trends and archive.

Trends describe collected public items, by their publication date. A source is
counted at most once per topic/day; article volume is not used as popularity.
"""
from __future__ import annotations

import datetime as dt
import hashlib
import json
from pathlib import Path
import re
from urllib.parse import urlsplit, urlunsplit, parse_qsl, urlencode

TZ = dt.timezone(dt.timedelta(hours=8))
DOMAINS = ('运动科学', '运动健康', 'AI')
DATE = re.compile(r'^\d{4}-\d{2}-\d{2}\.json$')
NOISE = re.compile(r'\bIPO\b|\bARR\b|valuation|\bseries [A-F]\b|fundrais|stock price|融资|估值|股价|招聘|限时优惠', re.I)


def read(p, default):
    return json.loads(p.read_text()) if p.exists() else default


def write(p, value):
    p.parent.mkdir(parents=True, exist_ok=True)
    text = json.dumps(value, ensure_ascii=False, indent=2) + '\n'
    if not p.exists() or p.read_text() != text:
        p.write_text(text)


def stamp(s):
    if not s:
        return None
    try:
        v = dt.datetime.fromisoformat(s.replace('Z', '+00:00'))
        return v.replace(tzinfo=TZ) if v.tzinfo is None else v
    except ValueError:
        return None


def canonical(url):
    u = urlsplit(url)
    q = [(k, v) for k, v in parse_qsl(u.query) if not k.lower().startswith('utm_') and k not in ('ref', 'fbclid')]
    return urlunsplit((u.scheme.lower(), u.netloc.lower(), u.path.rstrip('/') or '/', urlencode(sorted(q)), ''))


def validate(d):
    items = d.get('items', [])
    counts = {x: sum(i.get('domain') == x for i in items) for x in DOMAINS}
    if d.get('summary', {}).get('total') != len(items) or d['summary'].get('counts') != counts:
        raise ValueError('Social summary does not match items: ' + d.get('date', '?'))
    for i in items:
        if i.get('domain') not in DOMAINS or not i.get('title') or not i.get('author') or not i.get('source', {}).get('url', '').startswith('https://'):
            raise ValueError('Incomplete social item: ' + str(i.get('id')))
        if i.get('published_date', d['date']) > d['date']:
            raise ValueError('Social item has a future publication date')


def classify(item, topics):
    if item.get('topic_id') in {t['id'] for t in topics}:
        return item['topic_id']
    return next((t['id'] for t in topics if t['domain'] == item['domain'] and re.search(t['pattern'], item['title'], re.I)),
                {'运动科学': 'sport-other', '运动健康': 'health-other', 'AI': 'ai-other'}[item['domain']])


def sync(root):
    out = root / 'data/social'
    cfg = read(root / 'config/social-sources.json', {'authors': [], 'discovery_channels': []})
    topics = read(root / 'config/social-topics.json', [])
    collection = read(out / 'collection.json', {})
    collected_at = collection.get('as_of')
    existing = read(out / 'observations.json', {'items': []})
    manual = read(out / 'manual-signals.json', [])
    overrides = read(out / 'publication-checks.json', {})
    records = {canonical(x['url']): x for x in existing['items']
               if not (overrides.get(x['url']) or overrides.get(canonical(x['url'])) or {}).get('exclude')}
    inputs = collection.get('candidates', []) + manual
    for x in inputs:
        if x.get('domain') not in DOMAINS or NOISE.search(x['title']):
            continue
        checked = overrides.get(x['url']) or overrides.get(canonical(x['url']))
        if checked and checked.get('exclude'):
            continue
        if not x.get('date_verified') and not checked:
            continue
        at = stamp(x.get('published_at'))
        day = checked.get('published_date') if checked else (at.astimezone(TZ).date().isoformat() if at else x.get('published_date'))
        if not day:
            continue
        key = canonical(x['url'])
        old = records.get(key, {})
        sources = sorted(set(x.get('observed_authors') or [x.get('source_author') or x.get('author', '')]))
        first_seen = x.get('observed_at') or collected_at or x.get('published_at')
        if not first_seen:
            continue
        record = dict(id=old.get('id') or x.get('id') or hashlib.sha256(key.encode()).hexdigest()[:12],
                      title=x['title'], url=x['url'], date=day, domain=x['domain'],
                      topic_id=classify(x, topics), sources=sources, platform=x.get('platform', '博客'),
                      first_seen=old.get('first_seen', first_seen), last_seen=first_seen)
        records[key] = record
    latest_at = max((stamp(x['last_seen']) for x in records.values()), default=None)
    if latest_at:
        cutoff = (latest_at.astimezone(TZ).date() - dt.timedelta(days=44)).isoformat()
        records = {k: x for k, x in records.items() if x['date'] >= cutoff}
    all_records = sorted(records.values(), key=lambda x: (x['date'], x['id']))
    write(out / 'observations.json', {'version': 1, 'items': all_records})

    status = {a['id']: a for a in collection.get('authors', [])}
    catalog = []
    for a in cfg['authors']:
        s = status.get(a['id'], {})
        catalog.append({k: a[k] for k in ('id', 'name', 'domain', 'homepage', 'focus', 'kind', 'platform', 'language', 'profiles') if k in a})
        catalog[-1].update(status=s.get('status', 'pending'), feed_url=s.get('feed_url'), recent_items=len(s.get('recent_item_ids', [])))
    write(out / 'sources.json', dict(checked_at=collected_at, total=len(catalog),
          feeds_connected=sum(a['status'] == 'feed_ok' for a in catalog), sources=catalog,
          discovery_channels=cfg['discovery_channels']))

    editions = []
    for p in sorted(out.glob('*.json')):
        if DATE.fullmatch(p.name):
            d = read(p, {})
            validate(d)
            editions.append(d)
    for n, d in enumerate(editions):
        d['navigation'] = {'prev': editions[n-1]['date'] if n else None,
                           'next': editions[n+1]['date'] if n+1 < len(editions) else None}
        d['trends_url'] = f"data/social/trends/{d['date']}.json"
        write(out / f"{d['date']}.json", d)
        end = dt.date.fromisoformat(d['date'])
        start = end - dt.timedelta(days=13)
        as_of = stamp(d.get('observed_at')) or dt.datetime.combine(end, dt.time.max, TZ)
        usable = [x for x in all_records if start.isoformat() <= x['date'] <= end.isoformat() and stamp(x['first_seen']) <= as_of]
        days = [(start + dt.timedelta(days=i)).isoformat() for i in range(14)]
        rows = []
        for t in topics:
            its = [x for x in usable if x['topic_id'] == t['id']]
            if not its:
                continue
            daily = []
            for day in days:
                daily_items = [x for x in its if x['date'] == day]
                daily.append({'date': day, 'value': len({s for x in daily_items for s in x['sources']}), 'item_ids': [x['id'] for x in daily_items]})
            rows.append(dict(id=t['id'], label=t['label'], domain=t['domain'],
                             source_count=len({s for x in its for s in x['sources']}), item_count=len(its), points=daily))
        write(out / 'trends' / f"{d['date']}.json", dict(version=1, start=start.isoformat(), end=end.isoformat(),
              as_of=d.get('observed_at'), unit='来源数／日', rows=rows, items=usable,
              total_items=len(usable), total_sources=len({s for x in usable for s in x['sources']})))

    if editions:
        newest = editions[-1]['date']
        write(out / 'latest.json', {'latest': newest, 'url': f'data/social/{newest}.json'})
        archive = []
        for d in reversed(editions):
            archive.append(dict(date=d['date'], title='社媒热点', summary_title=d['summary'].get('title', '社媒热点'),
                signal=d['summary']['signal'], total=len(d['items']), counts=d['summary']['counts'],
                highlights=[i['one_liner'] for i in d['items'][:3]]))
        write(out / 'archive.json', archive)


if __name__ == '__main__':
    sync(Path(__file__).resolve().parents[1])
