# 外部 TTS 扩展 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 让 Cutia 的 TTS 能力从硬编码单一路由改为可配置的外部 TTS API 调用，并继续把生成语音接入媒体库和时间线。

**Architecture:** 在 `apps/web/src/lib/tts/` 新增可测试的 OpenAI 兼容 TTS 适配层，`/api/tts/generate` 只负责校验和响应转换，前端调用协议保持 `{ audio }` 不变。通过 `packages/env` 暴露配置，避免把供应商细节散落到 UI 和编辑器逻辑里。

**Tech Stack:** Next.js route handlers, TypeScript, Zod, Bun test, OpenAI-compatible HTTP API

---

## Task 1: 补环境与 voice 常量基线

**Files:**
- Modify: `packages/env/src/web.ts`
- Modify: `apps/web/src/constants/tts-constants.ts`

**Step 1: 写出目标测试用例草案**

- 目标行为：
  - TTS 配置可从环境读取
  - `default` voice 会映射到可用的默认外部 voice

**Step 2: 运行当前目标测试确认缺失**

Run: `bun test apps/web/src/lib/tts/openai-compatible.test.ts`
Expected: FAIL，原因是测试文件或实现不存在。

**Step 3: 为后续实现准备最小配置面**

- 在环境 schema 中加入 `API_BASE_URL`、`API_MODEL`、`API_KEY`
- 在 TTS 常量中定义默认 voice 与可选 voice 列表

**Step 4: 运行定向测试**

Run: `bun test apps/web/src/lib/tts/openai-compatible.test.ts`
Expected: 仍然失败，但失败点缩小到适配实现缺失。

**Step 5: Commit**

```bash
git add packages/env/src/web.ts apps/web/src/constants/tts-constants.ts
git commit -m "feat: prepare external tts config"
```

### Task 2: 先写失败测试覆盖外部 TTS 适配层

**Files:**
- Create: `apps/web/src/lib/tts/openai-compatible.test.ts`
- Create: `apps/web/src/lib/tts/openai-compatible.ts`

**Step 1: 写失败测试**

- 成功场景：正确构造 `/audio/speech` 请求并返回音频
- 失败场景：上游 JSON 错误、文本错误、空配置错误
- voice 场景：`default` 被映射为默认 voice

**Step 2: 运行测试验证失败**

Run: `bun test apps/web/src/lib/tts/openai-compatible.test.ts`
Expected: FAIL，且失败原因为导入缺失或行为不匹配，不是测试写错。

**Step 3: 写最小实现**

- 提供配置解析
- 提供请求构造
- 提供错误解析
- 提供音频数组缓冲区返回

**Step 4: 运行测试确认通过**

Run: `bun test apps/web/src/lib/tts/openai-compatible.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add apps/web/src/lib/tts/openai-compatible.ts apps/web/src/lib/tts/openai-compatible.test.ts
git commit -m "feat: add external tts adapter"
```

### Task 3: 接回 API 路由

**Files:**
- Modify: `apps/web/src/app/api/tts/generate/route.ts`

**Step 1: 写失败测试预期**

- 通过 Task 2 已确保适配层正确
- 当前路由仍硬编码旧上游，因此与新适配层设计不一致

**Step 2: 运行现有测试基线**

Run: `bun test apps/web/src/lib/tts/openai-compatible.test.ts`
Expected: PASS

**Step 3: 最小改造路由**

- 删除硬编码上游 URL 和旧返回结构解析
- 保留 Zod 请求校验
- 调用适配层并统一转换为 `{ audio }`

**Step 4: 运行相关测试**

Run: `bun test apps/web/src/lib/tts/openai-compatible.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add apps/web/src/app/api/tts/generate/route.ts
git commit -m "feat: wire route to external tts provider"
```

### Task 4: 端到端验证与整理

**Files:**
- Modify: `docs/plans/2026-03-17-tts-external-provider-design.md`
- Modify: `docs/plans/2026-03-17-tts-external-provider.md`

**Step 1: 运行自动化测试**

Run: `pnpm --filter @cutia/web test -- apps/web/src/lib/tts/openai-compatible.test.ts`
Expected: PASS

**Step 2: 运行真实外部 TTS 验证**

Run: `bun --eval '<补一段调用适配层的脚本>'`
Expected: 输出非空音频字节长度，不打印密钥。

**Step 3: 检查格式与类型**

Run: `pnpm --filter @cutia/web lint`
Expected: PASS

**Step 4: 整理工作台与提交内容**

- 更新 Linear 工作台中的验收、验证和备注
- 推送分支并创建 PR

**Step 5: Commit**

```bash
git add docs/plans/2026-03-17-tts-external-provider-design.md docs/plans/2026-03-17-tts-external-provider.md
git commit -m "docs: capture external tts plan"
```
