# Freeze Frame Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Capture the selected video's displayed source frame as a reusable PNG and insert a three-second image clip on the nearest available video track above it as one undoable edit.

**Architecture:** Reuse the existing media asset, `ImageElement`, Mediabunny, and command batch paths. Put only the two non-trivial decisions in existing timeline domain utilities: source-time mapping and target-track lookup. The action owns validation, capture, persistence, batch construction, feedback, and selection.

**Tech Stack:** TypeScript, React, Bun test, Mediabunny, existing EditorCore managers and commands.

---

### Task 1: Protect frame-time and track-placement semantics

**Files:**
- Create: `apps/web/src/lib/timeline/__tests__/freeze-frame.test.ts`
- Modify: `apps/web/src/lib/timeline/element-utils.ts`
- Modify: `apps/web/src/services/renderer/nodes/visual-node.ts`

**Step 1: Write the failing tests**

Add literal expectations for forward, trimmed, speed-adjusted, and reversed source times. Add track fixtures proving the nearest free video track above is chosen, occupied/non-video tracks are skipped, and `null` is returned when a new track is required.

```ts
expect(getVisualSourceTime({ timelineTime: 7, startTime: 5, duration: 8, trimStart: 3, playbackRate: 2 })).toBe(7);
expect(findAvailableVideoTrackAbove({ tracks, sourceTrackId: "source", startTime: 4, endTime: 7 })).toBe("nearest-free");
```

**Step 2: Run the focused test and verify RED**

Run: `bun test apps/web/src/lib/timeline/__tests__/freeze-frame.test.ts`

Expected: FAIL because both exports do not exist.

**Step 3: Add the minimum domain functions**

In `element-utils.ts`, add:

```ts
export function getVisualSourceTime({ timelineTime, startTime, duration, trimStart, playbackRate = 1, reversed = false }: ...): number;
export function findAvailableVideoTrackAbove({ tracks, sourceTrackId, startTime, endTime }: ...): string | null;
```

The track search walks from `sourceIndex - 1` toward index `0`, filters to video tracks, and reuses `wouldElementOverlap`.

Replace `VisualNode.getLocalTime`'s duplicate formula with `getVisualSourceTime`, mapping `timeOffset` to `startTime`.

**Step 4: Run the focused test and verify GREEN**

Run: `bun test apps/web/src/lib/timeline/__tests__/freeze-frame.test.ts`

Expected: PASS.

### Task 2: Add native-resolution PNG extraction

**Files:**
- Modify: `apps/web/src/lib/media/processing.ts`

**Step 1: Add one browser-facing extraction function**

Reuse the existing Mediabunny `Input`, `VideoSampleSink`, decode validation, and frame cleanup. Draw the returned sample to a canvas sized to `videoTrack.displayWidth` by `displayHeight`, encode it with `canvas.toBlob(..., "image/png")`, and return `{ file, width, height }`.

```ts
export async function extractVideoFrame({ videoFile, timeInSeconds, fileName }: ...): Promise<{ file: File; width: number; height: number }>;
```

Keep thumbnail generation unchanged; do not resize or encode JPEG for freeze frames.

**Step 2: Type-check through the web build after action integration**

The function depends on real browser canvas and Mediabunny decoding, so verify it through the application build and manual browser capture rather than a synthetic decoder mock.

### Task 3: Implement the atomic freeze-frame action

**Files:**
- Modify: `apps/web/src/lib/actions/definitions.ts`
- Modify: `apps/web/src/lib/actions/types.ts`
- Modify: `apps/web/src/hooks/actions/use-editor-actions.ts`

**Step 1: Define one optional-argument action**

Add `freeze-frame` in `ACTIONS` and map its arguments to:

```ts
"freeze-frame": { trackId: string; elementId: string } | undefined;
```

Explicit arguments select the context-menu source; absent arguments require exactly one selected video.

**Step 2: Validate and capture before mutation**

In `useEditorActions`, add a `useRef(false)` in-flight guard. Resolve the source, require `startTime <= playhead < startTime + duration`, require the source media `File`, calculate local time with `getVisualSourceTime`, and call `extractVideoFrame`. Show one loading toast and replace it with success, warning, or error feedback.

**Step 3: Persist and commit one command batch**

Create `AddMediaAssetCommand` first to reserve the media ID, pre-save that exact asset through `storageService.saveMediaAsset`, then build:

```ts
new BatchCommand([
  addMediaCommand,
  ...(targetTrackId ? [] : [addTrackCommand]),
  insertElementCommand,
]);
```

Use `findAvailableVideoTrackAbove`; if it returns `null`, insert an `AddTrackCommand("video", sourceTrackIndex)` immediately above the source. Build a normal three-second image element, copying the source transform and opacity, and insert explicitly into the chosen track. On synchronous commit failure, delete the pre-saved asset and revoke its object URL. On success, select the inserted element. Undo/redo then reuse the command-retained `File` and IDs without re-decoding.

### Task 4: Wire both user entry points

**Files:**
- Modify: `apps/web/src/components/editor/panels/timeline/timeline-toolbar.tsx`
- Modify: `apps/web/src/components/editor/panels/timeline/timeline-element.tsx`

**Step 1: Enable the snowflake toolbar action**

Subscribe to element selection, resolve exactly one selected video, and enable the existing `SnowIcon` button only while the playhead is inside it. Invoke `freeze-frame` without arguments and label the tooltip `Freeze frame`.

**Step 2: Add the video context-menu item**

For every video element, add a `Freeze frame` item with `SnowIcon`. Invoke the same action with the clicked `{ trackId, elementId }`, independent of current selection.

### Task 5: Verify the complete change

**Files:**
- Verify all modified files

**Step 1: Run focused and complete tests**

Run:

```bash
bun test apps/web/src/lib/timeline/__tests__/freeze-frame.test.ts
bun test
```

Expected: all pass with no warnings or unhandled errors.

**Step 2: Run static verification**

Run:

```bash
bun run lint:web
bun run build:web
```

Expected: both exit successfully.

**Step 3: Inspect the final diff**

Run `git diff --check`, `git status --short`, and review the diff for source-video mutation, new dependencies, placeholder code, and accidental unrelated changes.

**Step 4: Manual browser verification when a usable local project is available**

Verify toolbar and context-menu captures, native PNG asset creation, three-second placement, copied transform/opacity, stretch behavior, undo/redo, and no partial output after a forced extraction/storage failure. If runtime state or a fixture is unavailable, report this separately from the verified static results.
