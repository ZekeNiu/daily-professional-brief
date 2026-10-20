"""Export both source windows and previous AI themes for the daily editor.

Run after writing the dated briefs, before writing data/topic-analysis/DATE.json.
No model API is used: the existing daily ChatGPT task reads and analyses this file.
"""
from __future__ import annotations

import argparse
import json
from pathlib import Path

from sync_briefs import sync
from topic_analysis import fingerprint


def prepare(root, date):
    sync(root, apply_topics=False)
    result = dict(version=1, date=date, channels={})
    earlier = [p for p in sorted((root / 'data/topic-analysis').glob('????-??-??.json')) if p.stem < date]
    previous = json.loads(earlier[-1].read_text()) if earlier else {}
    for channel, folder in [('journal', 'data/trends'), ('social', 'data/social/trends')]:
        trend = json.loads((root / folder / f'{date}.json').read_text())
        items = [{k: x[k] for k in ('id', 'date', 'domain', 'url', 'title', 'short_title', 'one_liner', 'sources') if k in x}
                 for x in trend['items']]
        result['channels'][channel] = dict(start=trend['start'], end=trend['end'], source_fingerprint=fingerprint(items),
            records=items, previous_topics=previous.get('channels', {}).get(channel, {}).get('topics', []))
    return result


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--date', required=True)
    parser.add_argument('--output', required=True, type=Path)
    args = parser.parse_args()
    result = prepare(Path(__file__).resolve().parents[1], args.date)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n')
    counts = ', '.join(f'{k} {len(v["records"])} records' for k, v in result['channels'].items())
    print(f'Topic input: {args.output}; {counts}')
