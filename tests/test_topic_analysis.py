"""Check the failure modes that could corrupt AI-driven chart membership."""
import copy
import json
from pathlib import Path
import sys
import tempfile
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'scripts'))
from topic_analysis import apply_analysis, fingerprint


class TopicAnalysisTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.trend = dict(channel='social', start='2026-10-19', end='2026-10-20', rows=[], items=[
            dict(id='a', date='2026-10-19', domain='运动科学', url='https://example.org/a', title='First record', sources=['Author A'], topic_id='old-category'),
            dict(id='b', date='2026-10-20', domain='运动科学', url='https://example.org/b', title='Second record', sources=['Author A'], topic_id='old-category'),
            dict(id='c', date='2026-10-20', domain='运动健康', url='https://example.org/c', title='Other field', sources=['Author B'], topic_id='health-old')])
        self.part = dict(start=self.trend['start'], end=self.trend['end'], source_fingerprint=fingerprint(self.trend['items']), unassigned_ids=['c'], topics=[dict(
            id='emerging-question', domain='运动科学', label='具体任务的共同议题', summary='这两条原始记录属于同一具体问题。', confidence='中', confidence_reason='两条可定位的原始记录。', item_ids=['a', 'b'], summary_refs=['a', 'b'])])
        self.path = self.root / 'data/topic-analysis/2026-10-20.json'
        self.path.parent.mkdir(parents=True)
        self.save()

    def save(self):
        self.path.write_text(json.dumps(dict(version=1, date='2026-10-20', generated_at='2026-10-20T09:00:00+08:00', generated_by='ChatGPT', channels={'social': self.part})))

    def test_membership_is_semantic_data_and_counts_remain_exact(self):
        result = apply_analysis(self.root, copy.deepcopy(self.trend))
        row = next(x for x in result['rows'] if x['kind'] == 'topic')
        self.assertEqual([x['value'] for x in row['points']], [1, 1])
        self.assertEqual(row['source_count'], 1)
        self.assertEqual(row['item_count'], 2)
        self.assertEqual(result['items'][2]['topic_id'], 'other-health')
        self.assertEqual(apply_analysis(self.root, copy.deepcopy(result)), result)

    def test_changed_input_requires_new_analysis(self):
        self.trend['items'][0]['title'] = 'A materially changed input'
        with self.assertRaisesRegex(ValueError, 'input changed'):
            apply_analysis(self.root, self.trend)

    def test_cross_field_or_unknown_references_are_rejected(self):
        self.part['topics'][0]['item_ids'] = ['a', 'c']
        self.part['topics'][0]['summary_refs'] = ['a', 'c']
        self.save()
        with self.assertRaisesRegex(ValueError, 'cross-field'):
            apply_analysis(self.root, self.trend)

    def test_duplicate_membership_is_rejected(self):
        other = copy.deepcopy(self.part['topics'][0]); other['id'] = 'another-question'
        self.part['topics'].append(other); self.save()
        with self.assertRaisesRegex(ValueError, 'only one primary'):
            apply_analysis(self.root, self.trend)

    def test_single_reference_cannot_support_a_synthesized_theme(self):
        self.part['topics'][0]['summary_refs'] = ['a']; self.save()
        with self.assertRaisesRegex(ValueError, 'two distinct'):
            apply_analysis(self.root, self.trend)

    def test_ungrouped_records_cannot_silently_disappear(self):
        self.part['unassigned_ids'] = []; self.save()
        with self.assertRaisesRegex(ValueError, 'Every reviewed record'):
            apply_analysis(self.root, self.trend)

    def test_new_analysis_does_not_backfill_an_older_edition(self):
        self.trend['end'] = '2026-10-18'
        self.assertEqual(apply_analysis(self.root, self.trend)['topic_mode'], 'category')


if __name__ == '__main__':
    unittest.main()
