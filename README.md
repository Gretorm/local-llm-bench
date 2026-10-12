# Local LLM Bench

Open-weight LLMs running **locally on a single consumer GPU** (AMD RX 9070 XT, 16 GB), used as autonomous coding agents. Each model gets the same prompt, no human help, and every game it produces is playable in the browser.

**Leaderboard with play links: https://gretorm.github.io/local-llm-bench/**

Protocol, prompt and scoring: [PROTOCOL.md](PROTOCOL.md)

## Minecraft clone

| Model | Play | Score | Notes | Code |
|---|---|---|---|---|
| [Qwen3.8 27B](https://github.com/Gretorm/local-llm-bench/blob/main/models/qwen3.8-27b.md) UD-IQ3_XXS · run 1 | [▶ Play](https://gretorm.github.io/local-llm-bench/benchmarks/minecraft/qwen3.8-27b/run-1/game/) | **68/100** PARTIAL | [Notes](https://github.com/Gretorm/local-llm-bench/blob/main/benchmarks/minecraft/qwen3.8-27b/run-1/notes.md) | [Code](https://github.com/Gretorm/local-llm-bench/tree/main/benchmarks/minecraft/qwen3.8-27b/run-1/game) |
| [Underdog Saluki 27B](https://github.com/Gretorm/local-llm-bench/blob/main/models/underdog-saluki-27b.md) IQ2 mix · run 1 | [▶ Play](https://gretorm.github.io/local-llm-bench/benchmarks/minecraft/underdog-saluki-27b/run-1/game/) | **29/100** FAIL | [Notes](https://github.com/Gretorm/local-llm-bench/blob/main/benchmarks/minecraft/underdog-saluki-27b/run-1/notes.md) | [Code](https://github.com/Gretorm/local-llm-bench/tree/main/benchmarks/minecraft/underdog-saluki-27b/run-1/game) |
| [Underdog Saluki 27B](https://github.com/Gretorm/local-llm-bench/blob/main/models/underdog-saluki-27b.md) IQ2 mix · run 2 | [▶ Play](https://gretorm.github.io/local-llm-bench/benchmarks/minecraft/underdog-saluki-27b/run-2/game/) | **3/100** FAIL | [Notes](https://github.com/Gretorm/local-llm-bench/blob/main/benchmarks/minecraft/underdog-saluki-27b/run-2/notes.md) | [Code](https://github.com/Gretorm/local-llm-bench/tree/main/benchmarks/minecraft/underdog-saluki-27b/run-2/game) |
