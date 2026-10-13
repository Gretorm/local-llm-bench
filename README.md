# Local LLM Bench

Open-weight LLMs running **locally on a single consumer GPU** (AMD RX 9070 XT, 16 GB), used as autonomous coding agents. Each model gets the same prompt, no human help, and every game it produces is playable in the browser.

**Leaderboard with play links: https://gretorm.github.io/local-llm-bench/**

Protocol, prompt and scoring: [PROTOCOL.md](PROTOCOL.md)

## Minecraft clone

Models ranked by their best run; click a model to see all its runs.

<details><summary><b><a href="https://github.com/Gretorm/local-llm-bench/blob/main/models/qwen3.8-27b.md">Qwen3.8 27B</a></b> UD-IQ3_XXS — <b>68/100</b> PARTIAL (best of 1 run: run 1) · <a href="https://gretorm.github.io/local-llm-bench/benchmarks/minecraft/qwen3.8-27b/run-1/game/">▶ Play</a> · <a href="https://github.com/Gretorm/local-llm-bench/blob/main/benchmarks/minecraft/qwen3.8-27b/run-1/notes.md">Notes</a> · <a href="https://github.com/Gretorm/local-llm-bench/tree/main/benchmarks/minecraft/qwen3.8-27b/run-1/game">Code</a></summary>

| Run | Play | Score | Notes | Code | Run time | Context window | tok/s |
|---|---|---|---|---|---|---|---|
| 1 | [▶ Play](https://gretorm.github.io/local-llm-bench/benchmarks/minecraft/qwen3.8-27b/run-1/game/) | **68/100** PARTIAL | [Notes](https://github.com/Gretorm/local-llm-bench/blob/main/benchmarks/minecraft/qwen3.8-27b/run-1/notes.md) | [Code](https://github.com/Gretorm/local-llm-bench/tree/main/benchmarks/minecraft/qwen3.8-27b/run-1/game) | 3 h 27 | 131K (KV q8_0) | 18.2 |

</details>

<details><summary><b><a href="https://github.com/Gretorm/local-llm-bench/blob/main/models/underdog-saluki-27b.md">Underdog Saluki 27B</a></b> IQ2 mix — <b>29/100</b> FAIL (best of 2 runs: run 1) · <a href="https://gretorm.github.io/local-llm-bench/benchmarks/minecraft/underdog-saluki-27b/run-1/game/">▶ Play</a> · <a href="https://github.com/Gretorm/local-llm-bench/blob/main/benchmarks/minecraft/underdog-saluki-27b/run-1/notes.md">Notes</a> · <a href="https://github.com/Gretorm/local-llm-bench/tree/main/benchmarks/minecraft/underdog-saluki-27b/run-1/game">Code</a></summary>

| Run | Play | Score | Notes | Code | Run time | Context window | tok/s |
|---|---|---|---|---|---|---|---|
| 1 | [▶ Play](https://gretorm.github.io/local-llm-bench/benchmarks/minecraft/underdog-saluki-27b/run-1/game/) | **29/100** FAIL | [Notes](https://github.com/Gretorm/local-llm-bench/blob/main/benchmarks/minecraft/underdog-saluki-27b/run-1/notes.md) | [Code](https://github.com/Gretorm/local-llm-bench/tree/main/benchmarks/minecraft/underdog-saluki-27b/run-1/game) | 2 h 45 | 262K (KV q4_0) | 41.6 |
| 2 | [▶ Play](https://gretorm.github.io/local-llm-bench/benchmarks/minecraft/underdog-saluki-27b/run-2/game/) | **3/100** FAIL | [Notes](https://github.com/Gretorm/local-llm-bench/blob/main/benchmarks/minecraft/underdog-saluki-27b/run-2/notes.md) | [Code](https://github.com/Gretorm/local-llm-bench/tree/main/benchmarks/minecraft/underdog-saluki-27b/run-2/game) | 1 h 07 | 131K (KV q8_0) | 48.8 |

</details>
