"""Check the social column's publication, dates and displayed chart counts."""
import datetime as dt
import json
from pathlib import Path
from build_social import validate

root = Path(__file__).resolve().parents[1]
out = root / 'data/social'
sources = json.loads((out / 'sources.json').read_text())
assert sources['total'] == len(sources['sources'])
assert sources['feeds_connected'] == sum(x['status'] == 'feed_ok' for x in sources['sources'])
assert len({s['id'] for s in sources['sources']}) == sources['total']
for p in sorted(out.glob('????-??-??.json')):
    d = json.loads(p.read_text()); validate(d)
    trend = json.loads((root / d['trends_url']).read_text())
    dates = [(dt.date.fromisoformat(d['date']) - dt.timedelta(days=13-i)).isoformat() for i in range(14)]
    assert trend['start'] == dates[0] and trend['end'] == dates[-1]
    assert len({i['id'] for i in trend['items']}) == len(trend['items'])
    assert all(dates[0] <= x['date'] <= dates[-1] for x in trend['items'])
    assert sum(r['item_count'] for r in trend['rows']) == trend['total_items'] == len(trend['items'])
    for row in trend['rows']:
        assert [p['date'] for p in row['points']] == dates
        for point in row['points']:
            actual = [x for x in trend['items'] if x['date'] == point['date'] and x['topic_id'] == row['id']]
            assert set(point['item_ids']) == {x['id'] for x in actual}
            assert point['value'] == len({source for x in actual for source in x['sources']})
    assert f'data/social/{d["date"]}.json' == f'data/social/{p.name}'
print(f'PASS: social publication and source/day chart counts; {sources["total"]} sources, {sources["feeds_connected"]} connected feeds')
