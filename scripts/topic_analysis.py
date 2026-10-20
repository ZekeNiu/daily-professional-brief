"""Apply a dated AI editorial grouping to immutable, source-backed records.

The daily ChatGPT task writes the grouping. This module only validates record
membership and computes chart values; it never invents themes or heat scores.
"""
from __future__ import annotations

import datetime as dt
import hashlib
import json
import re
from pathlib import Path

FIELDS = {'运动科学': 'sport', '运动健康': 'health', 'AI': 'ai', '全球重要事件': 'global'}
ACTIVE_FROM = '2026-10-20'


def fingerprint(items):
    fields = ('id', 'date', 'domain', 'url', 'title', 'short_title', 'one_liner', 'sources')
    values = [{k: item.get(k) for k in fields} for item in sorted(items, key=lambda x: x['id'])]
    return hashlib.sha256(json.dumps(values, ensure_ascii=False, sort_keys=True, separators=(',', ':')).encode()).hexdigest()


def apply_analysis(root: Path, trend: dict) -> dict:
    path = root / 'data/topic-analysis' / f"{trend['end']}.json"
    if not path.exists():
        trend['topic_mode'] = 'category'
        return trend
    analysis = json.loads(path.read_text())
    if analysis.get('version') != 1 or analysis.get('date') != trend['end']:
        raise ValueError(f'Invalid topic analysis edition: {path.name}')
    at = dt.datetime.fromisoformat(analysis['generated_at'].replace('Z', '+00:00'))
    if at.tzinfo is None:
        raise ValueError('Topic analysis timestamp must include timezone')
    part = analysis['channels'][trend['channel']]
    if (part.get('start'), part.get('end')) != (trend['start'], trend['end']):
        raise ValueError('AI topic analysis window does not match source snapshot')
    if part.get('source_fingerprint') != fingerprint(trend['items']):
        raise ValueError(f"AI topic input changed for {trend['channel']} {trend['end']}; regenerate analysis")
    records = {x['id']: x for x in trend['items']}
    topics, used, topic_ids = [], set(), set()
    for topic in part['topics']:
        topic_id = topic['id']
        if not re.fullmatch(r'[a-z][a-z0-9-]{2,63}', topic_id) or topic_id in topic_ids or topic_id.startswith('other-'):
            raise ValueError('Invalid or duplicate AI topic ID')
        if topic['domain'] not in ('运动科学', '运动健康', 'AI'):
            raise ValueError('Unknown AI topic field')
        if not 4 <= len(topic['label']) <= 24 or not 1 <= len(topic['summary']) <= 180:
            raise ValueError('AI topic label or summary is missing or too long')
        if topic.get('confidence') not in ('高', '中', '低', '未知') or not topic.get('confidence_reason'):
            raise ValueError('AI topic needs confidence and its basis')
        ids, refs = topic['item_ids'], topic['summary_refs']
        if len(ids) != len(set(ids)) or len(refs) != len(set(refs)) or len(refs) < 2 or not set(refs) <= set(ids):
            raise ValueError('Topic summary needs at least two distinct member references')
        if used.intersection(ids):
            raise ValueError('A record can have only one primary AI topic')
        if any(i not in records or records[i]['domain'] != topic['domain'] for i in ids):
            raise ValueError('Unknown or cross-field record in AI topic')
        if len({records[i]['url'].rstrip('/') for i in refs}) < 2:
            raise ValueError('Topic references must identify distinct original content')
        used.update(ids); topic_ids.add(topic_id)
        topics.append({k: topic[k] for k in ('id', 'domain', 'label', 'summary', 'summary_refs', 'confidence', 'confidence_reason')} | {'kind': 'topic'})
    unassigned = part['unassigned_ids']
    if len(unassigned) != len(set(unassigned)) or used.intersection(unassigned) or used | set(unassigned) != set(records):
        raise ValueError('Every reviewed record must be assigned once or explicitly left ungrouped')
    # A stable topic ID must continue to refer to the same field in later editions.
    for old_path in sorted((root / 'data/topic-analysis').glob('????-??-??.json')):
        if old_path.stem >= trend['end']:
            continue
        old = json.loads(old_path.read_text()).get('channels', {}).get(trend['channel'], {})
        old_fields = {x['id']: x['domain'] for x in old.get('topics', [])}
        if any(t['id'] in old_fields and old_fields[t['id']] != t['domain'] for t in topics):
            raise ValueError('An existing topic ID cannot move to another field')
    membership = {i: t['id'] for t in part['topics'] for i in t['item_ids']}
    for item in trend['items']:
        item['category_id'] = item.get('category_id', item['topic_id'])
        item['topic_id'] = membership.get(item['id'], 'other-' + FIELDS[item['domain']])
    for domain, field in FIELDS.items():
        if any(x['domain'] == domain and x['id'] in unassigned for x in trend['items']):
            topics.append(dict(id='other-' + field, domain=domain, label='其他已收录内容', kind='other'))
    days = [(dt.date.fromisoformat(trend['start']) + dt.timedelta(days=i)).isoformat()
            for i in range((dt.date.fromisoformat(trend['end']) - dt.date.fromisoformat(trend['start'])).days + 1)]
    rows = []
    for topic in topics:
        group = [x for x in trend['items'] if x['topic_id'] == topic['id']]
        points = []
        for day in days:
            daily = [x for x in group if x['date'] == day]
            value = len(daily) if trend['channel'] == 'journal' else len({s for x in daily for s in x['sources']})
            points.append(dict(date=day, value=value, item_ids=[x['id'] for x in daily]))
        rows.append(topic | dict(source_count=len({s for x in group for s in x['sources']}), item_count=len(group), points=points))
    trend.update(version=3, rows=rows, topic_mode='ai', topic_analysis=dict(
        generated_at=analysis['generated_at'], generated_by=analysis['generated_by'],
        source_fingerprint=part['source_fingerprint'], input_items=len(records), grouped_items=len(used)))
    return trend
