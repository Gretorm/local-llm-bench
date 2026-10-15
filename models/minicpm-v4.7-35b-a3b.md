# MiniCPM-V 4.7 35B-A3B

| | |
|---|---|
| Weights | `MiniCPM-V-4_7-35B-A3B-Q4_K_M.gguf` (21.17 GB), [openbmb/MiniCPM-V-4.7-35B-A3B-gguf](https://huggingface.co/openbmb/MiniCPM-V-4.7-35B-A3B-gguf) (the publisher's own quants); vision projector `mmproj-model-f16.gguf` (1.12 GB) from the same repo |
| Base | [openbmb/MiniCPM-V-4.7-35B-A3B](https://huggingface.co/openbmb/MiniCPM-V-4.7-35B-A3B) (Apache-2.0), vision-language model on a Qwen3.5/3.6 35B-A3B backbone: Mixture-of-Experts, 35B parameters, about 3B active (8 of 256 experts + 1 shared), 40 layers of which 30 linear-attention (Gated DeltaNet) and 10 full-attention; native context 262144; SigLIP2 vision encoder |
| Engine | llama.cpp b11642, Vulkan build |
| Memory | ≈ 14.8 GB of VRAM; the experts of 17 layers (8.3 GB) stay in system RAM; vision projector on the CPU |

## Server settings

```
-ngl 99 --n-cpu-moe 17 -fa on -c 131072 -np 1 -ctk q8_0 -ctv q8_0
--mmproj mmproj-model-f16.gguf --no-mmproj-offload
--temp 1.0 --top-p 0.95 --top-k 20 --min-p 0.0 --reasoning-budget 8192
--ctx-checkpoints 16 --cache-ram 4096
```

- Only the 10 full-attention layers have a KV cache: 1.36 GB at 131K tokens with an 8-bit cache, which leaves room for most of the experts on the GPU.
- Thinking is on (the chat template's default); sampling from the model's `generation_config.json`. The publisher's benchmarks use instruct mode (thinking off).
- The vision projector runs on the CPU (no VRAM, about 4 s per image), so the agent receives browser screenshots as images.
- No speculative decoding: the publisher's DSpark draft model works in llama.cpp, but with a recurrent model each drafted token needs its own state copy (1 GB for 15 tokens), plus the draft's weights, KV cache and compute buffers. That pushes 3-4 more expert layers to system RAM, and acceptance drops with long prompts: slower than no draft at 20K tokens.

## Quant choice

| Config | Experts in RAM | tok/s (temperature 0, short → 20K) | Prompt tok/s at 20K |
|---|---|---|---|
| Q4_K_M + DSpark (15 drafted) | 18 layers | 14.8 → 7.9 (spills to system RAM) | 211 |
| Q4_K_M + DSpark (4 drafted) | 21 layers | 44.4 → 36.5 | 436 |
| **Q4_K_M** | **17 layers** | **43.4 → 43.8** | **548** |
| mix_q3gud_im (15.50 GB, 3-bit experts) | 8 layers | 59.3 → 76.0 | 1180 |

Q4_K_M was kept as the biggest quant measured, well above the 30 tok/s target at 20K tokens. In the agent (temperature 1.0, thinking on) it ran at 42 tok/s on average.

## Runs

| Benchmark | Run | Score | Notes |
|---|---|---|---|
| Minecraft | 1 | 3/100 FAIL | [notes](../benchmarks/minecraft/minicpm-v4.7-35b-a3b/run-1/notes.md) |
