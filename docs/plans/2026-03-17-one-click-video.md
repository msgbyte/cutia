# 一键成片功能 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 在编辑器 AI 面板中提供固定模板入口，基于当前已导入素材一键生成可继续编辑的时间线草稿，并支持撤销。

**Architecture:** 通过纯函数生成模板化 `TimelineTrack[]`，再用一个新的 timeline command 原子替换 active scene 的 tracks。UI 只负责展示模板、校验素材和发起 action，避免把编排逻辑塞进 React 组件。

**Tech Stack:** Next.js App Router, React 19, Zustand, EditorCore/Timeline commands, Bun test, Biome

---

## Task 1: 建立一键成片生成器的测试骨架

**Files:**
- Create: `apps/web/src/lib/auto-edit/generate-template-cut.test.ts`
- Create: `apps/web/src/lib/auto-edit/templates.ts`
- Create: `apps/web/src/lib/auto-edit/generate-template-cut.ts`

**Step 1: Write the failing test**

```typescript
import { describe, expect, test } from "bun:test";
import { generateTemplateCut } from "./generate-template-cut";

describe("generateTemplateCut", () => {
	test("使用视觉素材生成主轨和文本轨", () => {
		const result = generateTemplateCut({
			templateId: "clean-cut",
			assets: [
				createImageAsset("cover.png"),
				createVideoAsset("clip.mp4", 8),
			],
		});

		expect(result.tracks.map((track) => track.type)).toEqual(["video", "text"]);
		expect(result.tracks[0]?.elements).toHaveLength(2);
		expect(result.transitions).toHaveLength(1);
	});
});
```

**Step 2: Run test to verify it fails**

Run: `bun test apps/web/src/lib/auto-edit/generate-template-cut.test.ts`
Expected: FAIL with missing module / missing export / behavior mismatch

**Step 3: Write minimal implementation**

- 新建模板定义文件，声明 `clean-cut`、`story-pulse`、`memory-album`
- 新建生成器纯函数，先满足：
  - 能筛出视觉素材
  - 能生成串行 video track
  - 能生成 intro/outro text track
  - 能产出 transition 描述

**Step 4: Run test to verify it passes**

Run: `bun test apps/web/src/lib/auto-edit/generate-template-cut.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add apps/web/src/lib/auto-edit/generate-template-cut.test.ts apps/web/src/lib/auto-edit/templates.ts apps/web/src/lib/auto-edit/generate-template-cut.ts
git commit -m "test: add template cut generator coverage"
```

## Task 2: 补充混合素材与错误分支测试

**Files:**
- Modify: `apps/web/src/lib/auto-edit/generate-template-cut.test.ts`
- Modify: `apps/web/src/lib/auto-edit/generate-template-cut.ts`

**Step 1: Write the failing test**

```typescript
test("存在音频素材时生成独立音轨", () => {
	const result = generateTemplateCut({
		templateId: "story-pulse",
		assets: [
			createImageAsset("a.png"),
			createAudioAsset("bgm.mp3", 12),
		],
	});

	expect(result.tracks.map((track) => track.type)).toEqual(["video", "text", "audio"]);
});

test("没有视觉素材时返回可展示错误", () => {
	expect(() =>
		generateTemplateCut({
			templateId: "clean-cut",
			assets: [createAudioAsset("voice.mp3", 5)],
		}),
	).toThrow("No visual assets");
});
```

**Step 2: Run test to verify it fails**

Run: `bun test apps/web/src/lib/auto-edit/generate-template-cut.test.ts`
Expected: FAIL on missing audio track/error handling

**Step 3: Write minimal implementation**

- 在生成器中加入：
  - 音频轨生成逻辑
  - 模板 pace 差异
  - `No visual assets` 异常

**Step 4: Run test to verify it passes**

Run: `bun test apps/web/src/lib/auto-edit/generate-template-cut.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add apps/web/src/lib/auto-edit/generate-template-cut.test.ts apps/web/src/lib/auto-edit/generate-template-cut.ts
git commit -m "feat: support mixed assets in template cuts"
```

## Task 3: 为模板成片引入可撤销命令

**Files:**
- Create: `apps/web/src/lib/commands/timeline/template/generate-template-cut.ts`
- Create: `apps/web/src/lib/commands/timeline/template/index.ts`
- Modify: `apps/web/src/lib/commands/timeline/index.ts`
- Modify: `apps/web/src/core/managers/timeline-manager.ts`

**Step 1: Write the failing test**

```typescript
test("生成命令可用 undo 恢复原始轨道", () => {
	// 保存旧 tracks，执行命令后变成新 tracks，再 undo 恢复
});
```

如果集成测试成本过高，则改为先写命令使用点并让 TypeScript/构建失败，作为红灯。

**Step 2: Run test to verify it fails**

Run: `bun test apps/web/src/lib/auto-edit/generate-template-cut.test.ts`
Expected: FAIL or `bun run build:web` 出现缺少命令导出/方法的问题

**Step 3: Write minimal implementation**

- 新命令保存旧 tracks 与新 tracks
- TimelineManager 暴露 `generateTemplateCut({ tracks })` 或同等语义方法
- 通过 CommandManager 执行，确保 undo/redo 可用

**Step 4: Run test to verify it passes**

Run: `bun test apps/web/src/lib/auto-edit/generate-template-cut.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add apps/web/src/lib/commands/timeline/template apps/web/src/lib/commands/timeline/index.ts apps/web/src/core/managers/timeline-manager.ts
git commit -m "feat: add undoable template cut command"
```

## Task 4: 接入动作系统

**Files:**
- Modify: `apps/web/src/lib/actions/definitions.ts`
- Modify: `apps/web/src/lib/actions/types.ts`
- Modify: `apps/web/src/hooks/actions/use-editor-actions.ts`

**Step 1: Write the failing test**

如果没有现成 action 测试基建，则先让编译失败：

```typescript
invokeAction("generate-template-cut", { templateId: "clean-cut" });
```

并让 TypeScript 报错“未知 action”作为红灯。

**Step 2: Run test to verify it fails**

Run: `bun run build:web`
Expected: FAIL because action/type/handler missing

**Step 3: Write minimal implementation**

- 添加 `generate-template-cut` action 定义
- 在 args map 中声明 `{ templateId: string }`
- 在 `useEditorActions` 中：
  - 读取 active project / media assets / timeline tracks
  - 调用生成器
  - 执行模板替换命令
  - 用 toast 反馈错误和成功

**Step 4: Run test to verify it passes**

Run: `bun run build:web`
Expected: PASS

**Step 5: Commit**

```bash
git add apps/web/src/lib/actions/definitions.ts apps/web/src/lib/actions/types.ts apps/web/src/hooks/actions/use-editor-actions.ts
git commit -m "feat: wire template cut action"
```

## Task 5: 在 AI 面板实现模板成片 UI

**Files:**
- Modify: `apps/web/src/components/editor/panels/assets/views/ai.tsx`

**Step 1: Write the failing test**

若缺少 React 测试基础，则先从构建红灯开始：

- 在 UI 中引用尚未存在的模板定义/状态
- 确认 `bun run build:web` 报错

**Step 2: Run test to verify it fails**

Run: `bun run build:web`
Expected: FAIL because UI references are incomplete

**Step 3: Write minimal implementation**

- 在 `AIView` 增加 `Templates` 子视图
- 渲染 3 个模板卡片
- 无视觉素材时展示空状态与“去 Media 面板”按钮
- 生成按钮调用 `invokeAction("generate-template-cut", { templateId })`
- 若当前时间线非空，先弹确认框再执行

**Step 4: Run test to verify it passes**

Run: `bun run build:web`
Expected: PASS

**Step 5: Commit**

```bash
git add apps/web/src/components/editor/panels/assets/views/ai.tsx
git commit -m "feat: add one-click template panel"
```

## Task 6: 同步翻译与全量验证

**Files:**
- Modify: `apps/web/public/locales/*/translation.json` (如工具自动更新)

**Step 1: Write the failing test**

不额外写新测试，直接执行全量校验作为红灯。

**Step 2: Run test to verify it fails**

Run: `bun run lint:web`
Expected: 如有新字符串未提取、lint 问题或类型问题则先失败

**Step 3: Write minimal implementation**

- 运行 `bun run translation:extract`（若新增文案）
- 修正 lint / formatting / type issues

**Step 4: Run test to verify it passes**

Run:
- `bun test`
- `bun run lint:web`
- `bun run build:web`

Expected:
- 全部退出码为 0

**Step 5: Commit**

```bash
git add docs/plans apps/web/src apps/web/public/locales
git commit -m "feat: add one-click template video drafts"
```
