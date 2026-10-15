# Gemma 4 26B-A4B

| | |
|---|---|
| Weights | `gemma-4-26B-A4B-it-UD-Q4_K_M.gguf` (16.95 GB, Unsloth Dynamic), [unsloth/gemma-4-26B-A4B-it-GGUF](https://huggingface.co/unsloth/gemma-4-26B-A4B-it-GGUF); MTP drafter `mtp-gemma-4-26B-A4B-it.gguf` (Q8_0, 0.46 GB) and vision projector `mmproj-F16.gguf` (1.19 GB) from the same repo |
| Base | [google/gemma-4-26B-A4B-it](https://huggingface.co/google/gemma-4-26B-A4B-it) (Apache-2.0), Mixture-of-Experts: 25.2B parameters, 3.8B active (8 of 128 experts + 1 shared), 30 layers, sliding-window attention (1024) with one global layer in six; native context 262144; vision |
| Engine | llama.cpp b11553, Vulkan build |
| Memory | ≈ 15.3 GB of VRAM; the experts of 10 layers (5.8 GB) stay in system RAM; vision projector on the CPU. System RAM reached 94 % of 32 GB during a run (8 GB prompt cache): use a smaller `--cache-ram` |

## Server settings

```
-ngl 99 --n-cpu-moe 10 -fa on -c 131072 -np 1 -ctk q8_0 -ctv q8_0
--model-draft mtp-gemma-4-26B-A4B-it-Q8_0.gguf --spec-type draft-mtp --spec-draft-n-max 3 -ngld 99 -ctkd q8_0 -ctvd q8_0
--mmproj mmproj-gemma-4-26B-A4B-it-F16.gguf --no-mmproj-offload
--temp 1.0 --top-p 0.95 --top-k 64 --min-p 0.0 --reasoning-budget 8192
--ctx-checkpoints 16 --cache-ram 8192
```

- The weights do not fit in 16 GB with a 131K context: as a MoE model, the experts of the first 10 layers run from system RAM (`--n-cpu-moe 10`). A higher value also applies to the one-layer MTP drafter, which then fails to load.
- Thinking is on (llama-server default for this template). The vision projector runs on the CPU (no VRAM, about 5 s per image), so the agent receives browser screenshots as images.
- Flash attention on Vulkan is slow with the 512-wide attention heads of the global layers (prompt processing ≈ 7× slower at 20K tokens than without it), but the 8-bit KV cache requires it.

## Quant choice

| Quant | Size | Fits at 131K / q8_0 | tok/s (temperature 0, short → 20K) | KL divergence vs Q8_0 (median) | Same top token |
|---|---|---|---|---|---|
| UD-Q3_K_XL | 12.91 GB | yes, no MTP | 106 → 89 | 0.074 | 72.7 % |
| UD-IQ4_XS | 13.60 GB | spills 1 GB | 96 → 69 | 0.061 | 74.7 % |
| QAT UD-Q4_K_XL | 14.25 GB | 6 expert layers in RAM + MTP | 92 → 77 | (different checkpoint) | 51.7 % |
| **UD-Q4_K_M** | 16.95 GB | 10 expert layers in RAM + MTP | **61 → 56** | **0.029** | **78.7 %** |

UD-Q4_K_M was kept as the closest to the original model. Speeds above are at temperature 0; in the agent (temperature 1.0, thinking on) it ran at 31.8 tok/s on average in run 1 (24-26 while thinking) and 58.4 tok/s in run 2, with the same settings. The gap with the temperature-0 figures varies with how often the MTP drafts are accepted (50 % while thinking, 77-82 % over a run); with experts in RAM, rejected drafts cost CPU time.

## Runs

| Benchmark | Run | Score | Notes |
|---|---|---|---|
| Minecraft | 1 | 11/100 FAIL | [notes](../benchmarks/minecraft/gemma4-26b-a4b/run-1/notes.md) |
| Minecraft | 2 | 16/100 FAIL | [notes](../benchmarks/minecraft/gemma4-26b-a4b/run-2/notes.md) |
