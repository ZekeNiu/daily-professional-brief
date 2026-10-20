"""Build dated, source-backed trend views for both editorial columns.

Journal charts use the date an item entered the brief, social charts use the
verified publication date. Editorial directions resolve to records in that
edition's window; later editions never supply an earlier edition's analysis.
"""
from __future__ import annotations

import datetime as dt
import hashlib
import re
from urllib.parse import urlsplit

from build_social import canonical, read, write
from topic_analysis import apply_analysis

DOMAINS = ('运动科学', '运动健康', 'AI', '全球重要事件')


def identity(item):
    url = canonical(item['source']['url'])
    doi = re.search(r'10\.\d{4,9}/[^\s)）]+', url + ' ' + item.get('evidence', ''), re.I)
    if doi:
        return doi.group().rstrip('.,;。').removesuffix('/full').removesuffix('/abstract').lower()
    # Release-note pages are mutable containers for several distinct events.
    if any(s in url for s in ('changelog', 'release-notes', 'CHANGELOG', 'releases/latest')):
        return url + '|' + item['title']
    return url


def topic_for(item, topics):
    text = ' '.join(str(item.get(k, '')) for k in ('title', 'short_title', 'one_liner'))
    return next((t for t in topics if t['domain'] == item['domain'] and re.search(t['pattern'], text, re.I)),
                next(t for t in topics if t['domain'] == item['domain'] and t.get('fallback')))


def resolve_directions(edition, trend):
    result = []
    records = trend['items']
    for direction in edition.get('trend_directions', []):
        if direction.get('domain') not in DOMAINS:
            raise ValueError('Unknown trend domain')
        evidence = []
        for ref in direction.get('references', []):
            found = [x for x in records if canonical(x['url']) == canonical(ref['url'])
                     and (not ref.get('edition_date') or x.get('edition_date') == ref['edition_date'])]
            if not found:
                raise ValueError(f"Trend reference outside {edition['date']} window: {ref['url']}")
            record = found[-1]
            if record['domain'] != direction['domain']:
                raise ValueError('Trend reference domain mismatch')
            evidence.append({**record, 'label': ref.get('label') or record.get('short_title') or record['title'],
                             'note': ref.get('note', '')})
        if len({canonical(x['url']) for x in evidence}) < 2:
            raise ValueError('A trend direction needs at least two distinct original items')
        for key in ('id', 'title', 'change', 'meaning', 'confidence', 'confidence_reason'):
            if not direction.get(key):
                raise ValueError('Missing trend direction field: ' + key)
        result.append({k: v for k, v in direction.items() if k != 'references'} |
                      {'evidence': sorted(evidence, key=lambda x: (x['date'], x['id'])),
                       'source_count': len({s for x in evidence for s in x['sources']})})
    if result:
        if len({x['id'] for x in result}) != len(result):
            raise ValueError('Duplicate trend direction ID')
        return result
    # Historical editions without an editorial synthesis get a factual reading
    # path, rather than newly authored claims being backdated into the archive.
    for domain in DOMAINS:
        rows = sorted((r for r in trend['rows'] if r['domain'] == domain and r['item_count'] >= 2),
                      key=lambda r: -r['item_count'])
        if not rows:
            continue
        row = rows[0]
        evidence = sorted((x for x in records if x['topic_id'] == row['id']), key=lambda x: x['date'])[-3:]
        result.append(dict(id=row['id'], domain=domain, title=row['label'],
            change='最近收录：' + (evidence[-1].get('short_title') or evidence[-1]['title']),
            meaning='', confidence='', confidence_reason='', kind='reading_path',
            source_count=len({s for x in evidence for s in x['sources']}),
            evidence=[{**x, 'label': x.get('short_title') or x['title'], 'note': x.get('one_liner', '')} for x in evidence]))
    return result[:4]


def sync(root, apply_topics=True):
    topics = read(root / 'config/journal-topics.json', [])
    editions = [read(p, {}) for p in sorted((root / 'data').glob('????-??-??.json'))]
    for edition in editions:
        end = dt.date.fromisoformat(edition['date'])
        start = end - dt.timedelta(days=29)
        days = [(start + dt.timedelta(days=i)).isoformat() for i in range(30)]
        records = {}
        for old in editions:
            if not start.isoformat() <= old['date'] <= edition['date']:
                continue
            for item in old['items']:
                key = identity(item)
                if key in records:
                    continue
                topic = topic_for(item, topics)
                publisher = item['source'].get('title', urlsplit(item['source']['url']).netloc).split('：')[0].split('（')[0]
                records[key] = dict(id=hashlib.sha256(key.encode()).hexdigest()[:12], title=item['title'],
                    short_title=item.get('short_title'), one_liner=item['one_liner'], domain=item['domain'],
                    url=item['source']['url'], date=old['date'], edition_date=old['date'],
                    topic_id=topic['id'], sources=[publisher], platform='期刊 / 官方发布', evidence=item.get('evidence', ''))
        items = list(records.values())
        rows = []
        for topic in topics:
            group = [x for x in items if x['topic_id'] == topic['id']]
            if group:
                rows.append(dict(id=topic['id'], label=topic['label'], domain=topic['domain'],
                    source_count=len({s for x in group for s in x['sources']}), item_count=len(group),
                    points=[dict(date=day, value=sum(x['date'] == day for x in group),
                                 item_ids=[x['id'] for x in group if x['date'] == day]) for day in days]))
        trend = dict(version=2, channel='journal', start=start.isoformat(), end=edition['date'],
            unit='条目／收录日', date_basis='收录日期', rows=rows, items=items,
            total_items=len(items), total_sources=len({s for x in items for s in x['sources']}))
        trend['directions'] = resolve_directions(edition, trend)
        trend = apply_analysis(root, trend) if apply_topics else trend | {'topic_mode': 'category'}
        write(root / 'data/trends' / f"{edition['date']}.json", trend)
        edition['trends_url'] = f"data/trends/{edition['date']}.json"
        write(root / 'data' / f"{edition['date']}.json", edition)
    for p in sorted((root / 'data/social').glob('????-??-??.json')):
        edition = read(p, {})
        path = root / edition['trends_url']
        trend = read(path, {})
        trend.update(version=2, channel='social', date_basis='公开内容发布日期')
        trend['directions'] = resolve_directions(edition, trend)
        trend = apply_analysis(root, trend) if apply_topics else trend | {'topic_mode': 'category'}
        write(path, trend)


if __name__ == '__main__':
    from pathlib import Path
    sync(Path(__file__).resolve().parents[1])
