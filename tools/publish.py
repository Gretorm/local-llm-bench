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
        m["play"] = f"{SITE}/{rel}/game/"
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
        out += [f"## {bench.capitalize()} clone", "",
                "| Model | Play | Score | Notes | Code |", "|---|---|---|---|---|"]
        for r in (x for x in runs if x["benchmark"] == bench):
            out.append(
                f"| [{r['model']}]({r['model_page']}) {r['quant']} · run {r['run']} "
                f"| [▶ Play]({r['play']}) | **{r['score']}/100** {r['verdict']} "
                f"| [Notes]({r['notes']}) | [Code]({r['code']}) |"
            )
        out.append("")
    return "\n".join(out)


def build_index(runs):
    rows = []
    for r in runs:
        e = {k: html.escape(str(v)) for k, v in r.items()}
        rows.append(
            f'<tr><td><a href="{e["model_page"]}">{e["model"]}</a>'
            f'<span class="sub">{e["quant"]} · run {e["run"]}</span></td>'
            f'<td><a class="play" href="{e["play"]}">▶ Play</a></td>'
            f'<td><span class="score" style="--c:{verdict_color(r["score"])}">{e["score"]}</span>'
            f'<span class="sub">{e["verdict"]}</span></td>'
            f'<td><a href="{e["notes"]}">Notes</a></td>'
            f'<td><a href="{e["code"]}">Code</a></td></tr>'
        )
    tpl = (ROOT / "tools" / "index.template.html").read_text(encoding="utf-8")
    return tpl.replace("{{ROWS}}", "\n".join(rows)).replace("{{REPO}}", REPO)


def main():
    if len(sys.argv) == 6 and sys.argv[1] == "import":
        _, _, src, bench, model, run = sys.argv
        dst = ROOT / "benchmarks" / bench / model / f"run-{run}" / "game"
        if dst.exists():
            shutil.rmtree(dst)
        shutil.copytree(src, dst, ignore=shutil.ignore_patterns(".git"))
        print(f"copied {src} -> {dst.relative_to(ROOT)}")
        return
    runs = load_runs()
    (ROOT / "README.md").write_text(build_readme(runs), encoding="utf-8")
    (ROOT / "index.html").write_text(build_index(runs), encoding="utf-8")
    print(f"{len(runs)} run(s) -> README.md, index.html")


if __name__ == "__main__":
    main()
