"""Build the leaderboard (README.md + index.html) from every benchmarks/**/meta.json.

Usage:
  python tools/publish.py                         regenerate README.md and index.html
  python tools/publish.py import SRC BENCH MODEL RUN
                                                  copy a game folder, untouched, to
                                                  benchmarks/BENCH/MODEL/run-RUN/game/
"""
import html
import json
import shutil
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
REPO = "https://github.com/Gretorm/local-llm-bench"
SITE = "https://gretorm.github.io/local-llm-bench"


def load_runs():
    runs = []
    for meta in sorted(ROOT.glob("benchmarks/*/*/run-*/meta.json")):
        m = json.loads(meta.read_text(encoding="utf-8"))
        rel = meta.parent.relative_to(ROOT).as_posix()
        # play_path: a hosting build next to game/ (e.g. "play/"), when the untouched game cannot run on Pages
        m["play"] = f"{SITE}/{rel}/{m.get('play_path', 'game/')}"
        m["notes"] = f"{REPO}/blob/main/{rel}/notes.md"
        m["code"] = f"{REPO}/tree/main/{rel}/game"
        m["model_page"] = f"{REPO}/blob/main/models/{m['model_slug']}.md"
        runs.append(m)
    return sorted(runs, key=lambda r: (r["benchmark"], -r["score"]))


def verdict_color(score):
    return "#2e9e5b" if score >= 70 else "#d08a1a" if score >= 40 else "#c8423b"


def build_readme(runs):
    out = [
        "# Local LLM Bench",
        "",
        "Open-weight LLMs running **locally on a single consumer GPU** (AMD RX 9070 XT, 16 GB), "
        "used as autonomous coding agents. Each model gets the same prompt, no human help, "
        "and every game it produces is playable in the browser.",
        "",
        f"**Leaderboard with play links: {SITE}/**",
        "",
        "Protocol, prompt and scoring: [PROTOCOL.md](PROTOCOL.md)",
        "",
    ]
    for bench in sorted({r["benchmark"] for r in runs}):
        bench_runs = [x for x in runs if x["benchmark"] == bench]  # sorted by score, best first
        models = list(dict.fromkeys(r["model_slug"] for r in bench_runs))
        out += [f"## {bench.capitalize()} clone", "",
                "Models ranked by their best run; click a model to see all its runs.", ""]
        for slug in models:
            b = next(x for x in bench_runs if x["model_slug"] == slug)  # best run
            mruns = sorted((x for x in bench_runs if x["model_slug"] == slug), key=lambda x: x["run"])
            n = f"{len(mruns)} run{'s' if len(mruns) > 1 else ''}"
            out += [f"<details><summary><b><a href=\"{b['model_page']}\">{b['model']}</a></b> {b['quant']} — "
                    f"<b>{b['score']}/100</b> {b['verdict']} (best of {n}: run {b['run']}) · "
                    f"<a href=\"{b['play']}\">▶ Play</a> · <a href=\"{b['notes']}\">Notes</a> · "
                    f"<a href=\"{b['code']}\">Code</a></summary>", "",
                    "| Run | Play | Score | Notes | Code | Run time | Context window | tok/s |",
                    "|---|---|---|---|---|---|---|---|"]
            for r in mruns:
                out.append(
                    f"| {r['run']} | [▶ Play]({r['play']}) | **{r['score']}/100** {r['verdict']} "
                    f"| [Notes]({r['notes']}) | [Code]({r['code']}) | {duration_label(r)} | {context_label(r)} | {r.get('tok_s', '—')} |"
                )
            out += ["", "</details>", ""]
    return "\n".join(out)


def duration_label(r):
    m = r.get("duration_min")
    return f"{m // 60} h {m % 60:02d}" if m else "—"


def context_label(r):
    ctx = f"{round(r['context'] / 1000)}K" if r.get("context") else "—"
    return ctx + (f" (KV {r['kv_cache']})" if r.get("kv_cache") else "")


def build_index(runs):
    sections = []
    for bench in sorted({r["benchmark"] for r in runs}):
        bench_runs = [x for x in runs if x["benchmark"] == bench]  # sorted by score, best first
        items = []
        for slug in dict.fromkeys(r["model_slug"] for r in bench_runs):
            b = next(x for x in bench_runs if x["model_slug"] == slug)  # best run
            mruns = sorted((x for x in bench_runs if x["model_slug"] == slug), key=lambda x: x["run"])
            e = {k: html.escape(str(v)) for k, v in b.items()}
            n = f"{len(mruns)} run{'s' if len(mruns) > 1 else ''}"
            rows = []
            for r in mruns:
                f = {k: html.escape(str(v)) for k, v in r.items()}
                rows.append(
                    f'<tr><td>{f["run"]}</td>'
                    f'<td><a class="play small" href="{f["play"]}">▶ Play</a></td>'
                    f'<td><span class="score" style="--c:{verdict_color(r["score"])}">{f["score"]}</span> '
                    f'<span class="sub">{f["verdict"]}</span></td>'
                    f'<td><a href="{f["notes"]}">Notes</a></td><td><a href="{f["code"]}">Code</a></td>'
                    f'<td>{html.escape(duration_label(r))}</td><td>{html.escape(context_label(r))}</td><td>{html.escape(str(r.get("tok_s", "—")))}</td></tr>'
                )
            items.append(
                f'<details><summary>'
                f'<span class="model"><a href="{e["model_page"]}">{e["model"]}</a>'
                f'<span class="sub">{e["quant"]} · best: run {e["run"]}</span></span>'
                f'<a class="play" href="{e["play"]}">▶ Play</a>'
                f'<span><span class="score" style="--c:{verdict_color(b["score"])}">{e["score"]}</span>'
                f'<span class="sub">{e["verdict"]}</span></span>'
                f'<a href="{e["notes"]}">Notes</a><a href="{e["code"]}">Code</a>'
                f'<span class="runs">{n}</span></summary>\n'
                f'<div class="detail"><table><thead><tr><th>Run</th><th>Play</th><th>Score</th><th>Notes</th>'
                f'<th>Code</th><th>Run time</th><th>Context window</th><th>tok/s</th></tr></thead><tbody>\n'
                + "\n".join(rows) + "\n</tbody></table></div></details>"
            )
        sections.append(
            f'  <h2>{html.escape(bench.capitalize())} clone</h2>\n'
            f'  <p class="hint">Models ranked by their best run. Click a row to see every run.</p>\n'
            f'  <div class="card">\n' + "\n".join(items) + "\n  </div>"
        )
    tpl = (ROOT / "tools" / "index.template.html").read_text(encoding="utf-8")
    return tpl.replace("{{SECTIONS}}", "\n".join(sections)).replace("{{REPO}}", REPO)


def main():
    if len(sys.argv) == 6 and sys.argv[1] == "import":
        _, _, src, bench, model, run = sys.argv
        dst = ROOT / "benchmarks" / bench / model / f"run-{run}" / "game"
        if dst.exists():
            shutil.rmtree(dst)
        # node_modules: installed dependencies, recreated by `npm install`, not the model's code
        shutil.copytree(src, dst, ignore=shutil.ignore_patterns(".git", "node_modules"))
        print(f"copied {src} -> {dst.relative_to(ROOT)}")
        return
    runs = load_runs()
    (ROOT / "README.md").write_text(build_readme(runs), encoding="utf-8")
    (ROOT / "index.html").write_text(build_index(runs), encoding="utf-8")
    print(f"{len(runs)} run(s) -> README.md, index.html")


if __name__ == "__main__":
    main()
