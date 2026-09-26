"""Build the homepage pointer, archive, date links, and permanent pages from briefs."""

from __future__ import annotations

import json
import re
from pathlib import Path


DATE_FILE = re.compile(r"^\d{4}-\d{2}-\d{2}\.json$")
DOMAINS = ("运动科学", "运动健康", "AI", "全球重要事件")


def write_if_changed(path: Path, content: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    if not path.exists() or path.read_text(encoding="utf-8") != content:
        path.write_text(content, encoding="utf-8")


def json_text(value: object) -> str:
    return json.dumps(value, ensure_ascii=False, indent=2) + "\n"


def validate(date: str, brief: dict) -> None:
    summary = brief.get("summary", {})
    items = brief.get("items")
    counts = summary.get("counts", {})
    if (
        brief.get("date") != date
        or not isinstance(items, list)
        or not items
        or summary.get("total") != len(items)
        or sum(counts.get(domain, 0) for domain in DOMAINS) != len(items)
        or any(
            item.get("domain") not in DOMAINS
            or not item.get("title")
            or not item.get("source", {}).get("url")
            for item in items
        )
    ):
        raise ValueError(f"Invalid or incomplete brief: {date}")


def archive_entry(brief: dict, existing: dict | None) -> dict:
    summary = brief["summary"]
    # Preserve the editor's previously written archive headings and highlights.
    candidates = sorted(
        brief["items"],
        key=lambda item: item.get("priority") != "重点关注",
    )
    selected, domains = [], set()
    for item in candidates:
        if item["domain"] not in domains:
            selected.append(item)
            domains.add(item["domain"])
        if len(selected) == 3:
            break
    for item in candidates:
        if len(selected) == 3:
            break
        if item not in selected:
            selected.append(item)
    heading = "、".join(item.get("short_title") or item["title"] for item in selected)
    highlights = [
        f'{item.get("short_title") or item["title"]}：{item.get("one_liner") or item["title"]}'
        for item in selected
    ]
    return {
        "date": brief["date"],
        "title": brief["title"],
        "total": summary["total"],
        "counts": summary["counts"],
        "signal": summary["signal"],
        "summary_title": (existing or {}).get("summary_title") or heading,
        "highlights": (existing or {}).get("highlights") or highlights,
    }


def sync(root: Path) -> None:
    data_dir = root / "data"
    paths = sorted(path for path in data_dir.glob("*.json") if DATE_FILE.fullmatch(path.name))
    if not paths:
        raise ValueError("No dated briefs found")

    archive_path = data_dir / "archive.json"
    old_entries = json.loads(archive_path.read_text(encoding="utf-8")) if archive_path.exists() else []
    old_by_date = {entry["date"]: entry for entry in old_entries}
    template = (root / "templates" / "brief.html").read_text(encoding="utf-8")
    if template.count("{{DATE}}") < 2:
        raise ValueError("Permanent-page template is missing date placeholders")

    briefs = []
    for path in paths:
        brief = json.loads(path.read_text(encoding="utf-8"))
        validate(path.stem, brief)
        briefs.append(brief)
    dates = [brief["date"] for brief in briefs]

    for i, brief in enumerate(briefs):
        brief["navigation"] = {
            "prev": dates[i - 1] if i else None,
            "next": dates[i + 1] if i + 1 < len(dates) else None,
        }
        write_if_changed(data_dir / f'{brief["date"]}.json', json_text(brief))
        page = root / "briefs" / brief["date"] / "index.html"
        write_if_changed(page, template.replace("{{DATE}}", brief["date"]))

    newest = dates[-1]
    write_if_changed(data_dir / "latest.json", json_text({
        "latest": newest,
        "url": f"data/{newest}.json",
    }))
    archive = [archive_entry(brief, old_by_date.get(brief["date"])) for brief in reversed(briefs)]
    write_if_changed(archive_path, json_text(archive))


if __name__ == "__main__":
    sync(Path(__file__).resolve().parents[1])
