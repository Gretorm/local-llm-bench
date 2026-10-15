# Muse Glimmer 30B

| | |
|---|---|
| Weights | `Muse-Glimmer-30B-UD-IQ3_M.gguf` (14.12 GB), [unsloth/Muse-Glimmer-30B-GGUF](https://huggingface.co/unsloth/Muse-Glimmer-30B-GGUF); vision projector `mmproj-Muse-Glimmer-30B-Q8_0.gguf` (2.05 GB) from the same repo |
| Base | [meta-models/Muse-Glimmer-30B](https://huggingface.co/meta-models/Muse-Glimmer-30B) (Apache-2.0, August 2026), distilled from Muse Spark and built for local agents: dense transformer, ~29.6B parameters with the vision encoder, 52 layers, attention [local, local, local, global] repeated (sliding window 2048), 32 query / 2 KV heads, context 131072; ViT-G/14 perception encoder (~1.8B); DFlash block-diffusion draft model |
| Engine | llama.cpp b11642, Vulkan build |
| Memory | ≈ 14.5 GB of VRAM; vision projector on the CPU |

## Server settings

```
-ngl 99 -fa on -c 131072 -np 1 -ctk q8_0 -ctv q8_0
--mmproj mmproj-Muse-Glimmer-30B-Q8_0.gguf --no-mmproj-offload
--temp 1.0 --top-p 0.95 --top-k 64 --min-p 0.0
--chat-template-kwargs {"reasoning_strength":"high"} --reasoning-budget 8192
--ctx-checkpoints 16 --cache-ram 8192
```

- Small KV cache: only 13 of the 52 layers attend to the whole context (2 KV heads), the others use a 2048-token window: 0.9 GB at 131K tokens with an 8-bit cache.
- Thinking cannot be switched off (the chat template always opens it); reasoning strength "high" is the template's default and one of the two levels the card recommends for coding and agents. Sampling from the model card.
- The vision projector runs on the CPU (no VRAM; about 6 s for a small image, 50 s for a browser screenshot), so the agent receives browser screenshots as images.
- No speculative decoding: the DFlash draft model (1.6 GB plus about 1 GB of compute buffers) does not fit in VRAM next to the weights, and on the CPU it made generation slower (19-21 tok/s instead of 35).

## Quant choice

| Config | VRAM | tok/s (temperature 0, short → 20K) | Prompt tok/s at 20K |
|---|---|---|---|
| **UD-IQ3_M** | **14.5 GB, no spill** | **35.3 → 35.0** | **834** |
| UD-IQ3_M + DFlash draft on the CPU | 14.7 GB + 1.5 GB spilled | 21.3 → 19.0 | 651 |

UD-IQ3_M is the biggest quant that fits in 16 GB with the benchmark's 131K context: the next one, UD-Q4_K_XL (15.88 GB), needs about 1.6 GB more, and partial CPU offload of a dense model is too slow on this machine. In the agent (temperature 1.0, reasoning strength high) it ran at 34-35 tok/s, flat from short prompts to 60K tokens of context.

## Runs

| Benchmark | Run | Score | Notes |
|---|---|---|---|
| Minecraft | 1 | 13/100 FAIL (17 once a one-character typo is fixed, × 0.75; strict 0) | [notes](../benchmarks/minecraft/muse-glimmer-30b/run-1/notes.md) |
| Minecraft | 1, fix phase (scored separately) | 18/100 FAIL | [notes](../benchmarks/minecraft/muse-glimmer-30b/run-1/fix/notes.md) |
