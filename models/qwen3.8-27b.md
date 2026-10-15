# Qwen3.8 27B

| | |
|---|---|
| Weights | `Qwen3.8-27B-UD-IQ3_XXS.gguf` (10.93 GB, Unsloth Dynamic, MTP head included), [unsloth/Qwen3.8-27B-GGUF](https://huggingface.co/unsloth/Qwen3.8-27B-GGUF) |
| Base | [Qwen/Qwen3.8-27B](https://huggingface.co/Qwen/Qwen3.8-27B) (Apache-2.0), hybrid `qwen35` architecture: 16 attention layers out of 64, the rest Gated DeltaNet; native context 262144 |
| Engine | llama.cpp b11553, Vulkan build |
| VRAM | ≈ 15.3 GB, 66/66 layers on GPU (text-only: no vision projector) |

## Server settings

```
-ngl 99 -fa on -c 131072 -np 1 -ub 256 -ctk q8_0 -ctv q8_0
--spec-type draft-mtp --spec-draft-n-max 2 -ctkd q4_0 -ctvd q4_0
--temp 1.0 --top-p 0.95 --top-k 20 --min-p 0.0 --reasoning-budget 8192
--ctx-checkpoints 16 --cache-ram 8192
```

- `-ub 256` frees ≈ 400 MB of compute buffers; with the default 512, part of the model spills into shared memory and generation drops to 14 tok/s at 80K tokens.
- `--reasoning-budget 8192` is required: without it, in thinking mode the model keeps re-checking correct code and hits 12K-token limits on simple tasks.

## Quant choice

Tested at 131K context with an 8-bit KV cache (the benchmark setting):

| Quant | Size | Code perplexity | Coding tasks (12) | tok/s |
|---|---|---|---|---|
| UD-IQ2_S | 8.37 GB | 2.070 | 9 | 37 (no MTP head in this file) |
| UD-Q2_K_XL | 9.83 GB | 1.870 | 9 | 37 without MTP (does not fit with MTP) |
| **UD-IQ3_XXS** | 10.93 GB | **1.730** | **11** | **61 → 53 at 20K, 27 at 120K** (MTP, `-ub 256`) |

## Speed

- Generation (temperature 0): 61 tok/s on a short prompt, 53 tok/s after 20K tokens, 33 tok/s at 80K, 27 tok/s at 120K (MTP draft acceptance 81-88 %).
- In the agent (temperature 1.0, thinking on): ≈ 30 tok/s at start; 18 tok/s average over run 1 and 23.5 over run 2 (both slowed by video memory spilling into system memory when other applications were opened during the run).
- Pre-run checks gave either 61 or 42 tok/s on a short prompt at the same memory use; the cause of the slower state was not found.
- Prompt processing: ≈ 690 tok/s at 20K tokens, 350 tok/s at 120K.

## Runs

| Benchmark | Run | Score | Notes |
|---|---|---|---|
| Minecraft | 1 | 68/100 PARTIAL | [notes](../benchmarks/minecraft/qwen3.8-27b/run-1/notes.md) |
| Minecraft | 2 | 46/100 PARTIAL (61 once a one-line bug is fixed, × 0.75) | [notes](../benchmarks/minecraft/qwen3.8-27b/run-2/notes.md) |
