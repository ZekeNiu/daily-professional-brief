"""Collect dated public feed metadata for the social column.

The source roster also records browser/search entries. Only explicitly enabled
public feeds are fetched here; account sessions are never used by this script.
"""
from __future__ import annotations

import argparse
import concurrent.futures
import datetime as dt
import email.utils
import hashlib
import html
from html.parser import HTMLParser
import json
from pathlib import Path
import re
import time
import urllib.error
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET

UTC = dt.timezone.utc
DOI = re.compile(r"10\.\d{4,9}/[-._;()/:a-z0-9]+", re.I)
TRACKING = {'fbclid', 'gclid', 'mc_cid', 'mc_eid', 'ref', 'source'}


def normalize_url(value: str) -> str:
    u = urllib.parse.urlsplit(html.unescape(value.strip()))
    query = [(k, v) for k, v in urllib.parse.parse_qsl(u.query) if not k.lower().startswith('utm_') and k.lower() not in TRACKING]
    return urllib.parse.urlunsplit((u.scheme.lower(), u.netloc.lower(), u.path.rstrip('/') or '/', urllib.parse.urlencode(sorted(query)), ''))


def plain(value: str) -> str:
    return re.sub(r'\s+', ' ', html.unescape(re.sub(r'<[^>]*>', ' ', value or ''))).strip()


def parsed_date(value: str) -> dt.datetime | None:
    if not value:
        return None
    for parser in (lambda s: dt.datetime.fromisoformat(s.replace('Z', '+00:00')), email.utils.parsedate_to_datetime):
        try:
            result = parser(value)
            return result.replace(tzinfo=UTC) if result.tzinfo is None else result.astimezone(UTC)
        except (ValueError, TypeError, OverflowError):
            pass
    return None


class Discovery(HTMLParser):
    def __init__(self):
        super().__init__()
        self.feeds = []
        self.social = []
        self.in_title = False
        self.title = []

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag == 'link' and 'alternate' in a.get('rel', '').lower() and any(x in a.get('type', '').lower() for x in ('rss', 'atom')):
            if a.get('href'):
                self.feeds.append(a['href'])
        if tag == 'a' and a.get('href'):
            u = urllib.parse.urlsplit(a['href'])
            if re.search(r'/(?:rss|feed)(?:\.xml)?/?$', u.path, re.I) or 'format=rss' in u.query:
                self.feeds.append(a['href'])
            if (u.hostname or '').lower() in {'x.com', 'www.x.com', 'twitter.com', 'www.twitter.com', 'bsky.app'}:
                self.social.append(a['href'])
        if tag == 'title':
            self.in_title = True

    def handle_endtag(self, tag):
        if tag == 'title':
            self.in_title = False

    def handle_data(self, data):
        if self.in_title:
            self.title.append(data)


def request(url: str, timeout: int) -> tuple[str, str]:
    if urllib.parse.urlsplit(url).scheme != 'https':
        raise ValueError('Only public HTTPS source URLs are supported')
    req = urllib.request.Request(url, headers={'User-Agent': 'DailyProfessionalBrief-SourceTrial/1.0', 'Accept': 'application/atom+xml,application/rss+xml,application/xml,text/xml,text/html;q=0.8', 'Accept-Encoding': 'identity'})
    with urllib.request.urlopen(req, timeout=timeout) as response:
        body = response.read(8_000_001)
        if len(body) > 8_000_000:
            raise ValueError('Source response exceeds 8 MB')
        return body.decode(response.headers.get_content_charset() or 'utf-8', errors='replace'), response.url


def child_text(element, names) -> str:
    for name in names:
        for c in element:
            if c.tag.rsplit('}', 1)[-1] == name and c.text:
                return c.text.strip()
    return ''


def parse_feed(text: str, base: str) -> list[dict]:
    root = ET.fromstring(text)
    kind = root.tag.rsplit('}', 1)[-1].lower()
    if kind not in {'rss', 'feed', 'rdf'}:
        raise ValueError('Response is not an RSS/Atom feed')
    items = []
    for entry in root.iter():
        if entry.tag.rsplit('}', 1)[-1] not in {'item', 'entry'}:
            continue
        title = plain(child_text(entry, ['title']))
        url = ''
        for c in entry:
            if c.tag.rsplit('}', 1)[-1] == 'link':
                if c.attrib.get('href') and c.attrib.get('rel', 'alternate') == 'alternate':
                    url = c.attrib['href']; break
                if c.text and c.text.strip().startswith('http'):
                    url = c.text.strip()
        # Some podcast feeds put the publisher's homepage in every <link>.
        # Prefer an episode permalink or its public audio enclosure in that case.
        if url and not urllib.parse.urlsplit(url).path.strip('/'):
            guid = child_text(entry, ['guid', 'id'])
            enclosure = next((c.attrib.get('url', '') for c in entry if c.tag.rsplit('}', 1)[-1] == 'enclosure'), '')
            if guid.startswith('https://'):
                url = guid
            elif enclosure.startswith('https://'):
                url = enclosure
        if not url or not title:
            continue
        if urllib.parse.urlsplit(urllib.parse.urljoin(base, url)).scheme not in ('http', 'https'):
            continue
        pub = child_text(entry, ['pubDate', 'published', 'date'])
        date_kind = 'published'
        if not pub:
            pub = child_text(entry, ['updated']); date_kind = 'updated_only'
        stamp = parsed_date(pub)
        author = child_text(entry, ['creator', 'author'])
        for c in entry:
            if c.tag.rsplit('}', 1)[-1] == 'author' and not author:
                author = child_text(c, ['name'])
        body = ' '.join(child_text(entry, [n]) for n in ['description', 'summary', 'content', 'encoded'])
        match_text = plain(' '.join((title, author, body)))
        items.append({'title': title, 'url': normalize_url(urllib.parse.urljoin(base, url)), 'published_at': stamp.isoformat() if stamp else None, 'date_kind': date_kind, 'byline': author, 'dois': sorted({m.lower().rstrip('.,;)') for m in DOI.findall(html.unescape(body))}), '_match_text': match_text})
    return items


def collect_author(author: dict, cfg: dict) -> dict:
    started = time.monotonic()
    attempts = []
    result = {**author, 'status': 'unavailable', 'homepage_read': False, 'feed_url': None, 'social_links': [], 'items': [], 'attempts': attempts}
    if author.get('collect') is False:
        result.update(status='search_entry', parsed_items=0, latest_visible_item_at=None, elapsed_seconds=0)
        return result
    homepage = author['homepage']
    timeout = cfg['timeout_seconds']
    candidates = [author['feed_url']] if author.get('feed_url') else []
    if candidates:
        try:
            body, resolved = request(candidates[0], timeout)
            entries = parse_feed(body, resolved)
            attempts.append({'url': candidates[0], 'status': 'feed_ok', 'entries': len(entries)})
            result.update(feed_url=resolved, items=entries, status='feed_ok')
        except Exception as exc:
            attempts.append({'url': candidates[0], 'status': type(exc).__name__, 'detail': str(exc)[:180]})
    try:
        if result['status'] == 'feed_ok':
            raise StopIteration
        body, resolved = request(homepage, timeout)
        attempts.append({'url': homepage, 'status': 'ok'})
        result.update(homepage_read=True, resolved_homepage=resolved)
        discovery = Discovery(); discovery.feed(body)
        result['page_title'] = plain(' '.join(discovery.title))
        result['social_links'] = sorted(set(discovery.social))[:6]
        candidates = [urllib.parse.urljoin(resolved, u) for u in discovery.feeds]
        # Some publishers still advertise HTTP feed URLs but serve the same URL over HTTPS.
        candidates = [('https:' + u[5:]) if u.startswith('http:') else u for u in candidates]
        # A homepage may itself be a feed (e.g. a publisher feed URL).
        try:
            direct = parse_feed(body, resolved)
            result.update(feed_url=resolved, items=direct, status='feed_ok')
        except (ET.ParseError, ValueError):
            result['status'] = 'homepage_only'
    except StopIteration:
        pass
    except Exception as exc:
        attempts.append({'url': homepage, 'status': type(exc).__name__, 'detail': str(exc)[:180]})
    if result['status'] != 'feed_ok':
        root = urllib.parse.urlsplit(result.get('resolved_homepage', homepage))
        # Two conventional public feed locations are tested only when no feed is advertised.
        if not candidates and author.get('probe_feed', True):
            origin = f'{root.scheme}://{root.netloc}'
            candidates = [origin + '/feed', origin + '/feed.xml']
        for url in list(dict.fromkeys(candidates))[:2]:
            try:
                body, resolved = request(url, timeout)
                items = parse_feed(body, resolved)
                attempts.append({'url': url, 'status': 'feed_ok', 'entries': len(items)})
                result.update(feed_url=resolved, items=items, status='feed_ok')
                break
            except Exception as exc:
                attempts.append({'url': url, 'status': type(exc).__name__, 'detail': str(exc)[:180]})
    items = result['items']
    if author.get('author_filter'):
        pattern = re.compile(author['author_filter'], re.I)
        items = [i for i in items if pattern.search(i['_match_text'])]
    if author.get('content_filter'):
        pattern = re.compile(author['content_filter'], re.I)
        items = [i for i in items if pattern.search(i['_match_text'])]
    result['parsed_items'] = len(items)
    result['latest_visible_item_at'] = max((i['published_at'] for i in items if i['published_at']), default=None)
    result['items'] = items[:cfg['max_items_per_source']]
    result['elapsed_seconds'] = round(time.monotonic() - started, 2)
    return result


def history(root: Path) -> tuple[dict, dict]:
    urls, dois = {}, {}
    paths = list((root / 'data').glob('????-??-??.json')) + list((root / 'data/social').glob('????-??-??.json'))
    for p in sorted(paths):
        brief = json.loads(p.read_text())
        for item in brief.get('items', []):
            url = item.get('source', {}).get('url', '')
            if url:
                urls.setdefault(normalize_url(url), []).append(brief['date'])
            for doi in DOI.findall(json.dumps(item, ensure_ascii=False)):
                dois.setdefault(doi.lower().rstrip('.,;)'), []).append(brief['date'])
    return urls, dois


def run(root: Path, config_path: Path, output: Path) -> dict:
    cfg = json.loads(config_path.read_text())
    as_of = dt.datetime.now(UTC) if cfg.get('as_of') == 'now' else parsed_date(cfg['as_of'])
    if as_of is None:
        raise ValueError('Invalid as_of timestamp')
    local = as_of.astimezone(dt.timezone(dt.timedelta(hours=8)))
    start = (local.replace(hour=0, minute=0, second=0, microsecond=0) - dt.timedelta(days=cfg['lookback_days'] - 1)).astimezone(UTC)
    topic_path = root / 'config/social-topics.json'
    topics = json.loads(topic_path.read_text()) if topic_path.exists() else []
    old_urls, old_dois = history(root)
    by_id = {}
    with concurrent.futures.ThreadPoolExecutor(max_workers=cfg['max_workers']) as pool:
        tasks = {pool.submit(collect_author, a, cfg): a['id'] for a in cfg['authors']}
        for future in concurrent.futures.as_completed(tasks):
            a = future.result(); by_id[a['id']] = a
            print(f"{a['name']}: {a['status']}; parsed={a['parsed_items']}", flush=True)
    authors = [by_id[a['id']] for a in cfg['authors']]
    merged = {}
    for author in authors:
        recent = []
        for item in author.pop('items'):
            stamp = parsed_date(item['published_at'])
            if stamp is None or not start <= stamp <= as_of:
                continue
            # Updated-only Atom entries require an explicit editorial date check.
            item['date_verified'] = item['date_kind'] == 'published'
            match_text = item.pop('_match_text', '')
            topic = next((t['id'] for t in topics if t['domain'] == author['domain'] and re.search(t['pattern'], item['title'] + ' ' + match_text[:1800], re.I)), None)
            item['topic_id'] = topic or {'运动科学':'sport-other','运动健康':'health-other','AI':'ai-other'}[author['domain']]
            item.update(domain=author['domain'], author_id=author['id'], source_author=author['name'], feed_url=author['feed_url'], platform=author.get('platform', '博客'), language=author.get('language', 'en'))
            previous = set(old_urls.get(item['url'], []))
            for doi in item['dois']:
                previous.update(old_dois.get(doi, []))
            item['previous_briefs'] = sorted(previous)
            item['id'] = hashlib.sha256(item['url'].encode()).hexdigest()[:12]
            key = item['dois'][0] if len(item['dois']) == 1 else item['url']
            if key not in merged:
                merged[key] = item
                item['observed_authors'] = [author['name']]
            elif author['name'] not in merged[key]['observed_authors']:
                merged[key]['observed_authors'].append(author['name'])
            recent.append(merged[key]['id'])
        author['recent_item_ids'] = recent
    candidates = sorted(merged.values(), key=lambda i: i['published_at'], reverse=True)
    summary = {'authors_total': len(authors), 'homepages_read': sum(a['homepage_read'] for a in authors), 'feeds_read': sum(a['status'] == 'feed_ok' for a in authors), 'candidates': len(candidates), 'published_date_candidates': sum(i['date_verified'] for i in candidates), 'already_reported': sum(bool(i['previous_briefs']) for i in candidates), 'authors_with_recent_candidates': sum(bool(a['recent_item_ids']) for a in authors)}
    result = {'version': 1, 'generated_at': dt.datetime.now(UTC).isoformat(), 'window_start': start.isoformat(), 'as_of': as_of.isoformat(), 'summary': summary, 'authors': authors, 'candidates': candidates}
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n')
    print(json.dumps(summary, ensure_ascii=False), flush=True)
    return result


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--config', default='config/social-sources.json')
    parser.add_argument('--output', default='trials/social/2026-10-19/collection.json')
    args = parser.parse_args()
    root = Path(__file__).resolve().parents[1]
    run(root, root / args.config, root / args.output)
