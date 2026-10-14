# Underdog Saluki 27B 1.0 + MTP

| | |
|---|---|
| Weights | `Underdog-Saluki-27B-1.0-IQ2-mix-MTP.gguf` (8.35 GB, IQ2 mix + Q8_0 MTP head), [Kujira/Underdog-Saluki-27B-1.0-MTP-GGUF](https://huggingface.co/Kujira/Underdog-Saluki-27B-1.0-MTP-GGUF) |
| Base | Qwen3.8-27B (hybrid `qwen35` architecture: 16 attention layers out of 64, the rest recurrent), native context 262144 |
| Engine | llama.cpp b11553, Vulkan build |
| VRAM | ≈ 13.9 GB at 262K q4_0 (run 1), ≈ 14.1 GB at 131K q8_0 (run 2), 66/66 layers on GPU |

## Server settings

Run 2 (current):

```
-ngl 99 -fa on -c 131072 -np 1 -ctk q8_0 -ctv q8_0
--spec-type draft-mtp --spec-draft-n-max 2 -ctkd q4_0 -ctvd q4_0
--temp 0.6 --top-p 0.95 --top-k 20 --reasoning-budget 8192
--ctx-checkpoints 16 --cache-ram 8192
```

Run 1 used `-c 262144 -ctk q4_0 -ctv q4_0`, everything else identical.

## Speed

- Generation: 65 tok/s on a short prompt, ≈ 53 tok/s after 21K tokens, ≈ 30 tok/s at 180K tokens (MTP draft acceptance 80-99 %).
- In the run 2 agent session (131K window): 48.8 tok/s on average, 30-64, MTP drafts accepted 87 %.
- Prompt processing: ≈ 700-800 tok/s, down to ≈ 300 tok/s at 190K tokens.

## Runs

| Benchmark | Run | Score | Notes |
|---|---|---|---|
| Minecraft | 1 | 20/100 FAIL | [notes](../benchmarks/minecraft/underdog-saluki-27b/run-1/notes.md) |
| Minecraft | 2 | 0/100 FAIL | [notes](../benchmarks/minecraft/underdog-saluki-27b/run-2/notes.md) |
