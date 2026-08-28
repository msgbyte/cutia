# Freeze Frame Design Spec

## Overview

Add a freeze-frame action that turns the frame shown by one video clip at the
playhead into a reusable image asset and automatically inserts a three-second
image clip on the timeline.

The implementation reuses the existing media asset, `ImageElement`, timeline,
preview, and export paths. It does not add a freeze-frame element type.

## Goals

- Capture the displayed source frame at the playhead at the video's native
  resolution.
- Save the result as a normal reusable image asset.
- Insert a three-second image clip aligned with the playhead.
- Let the image clip be extended without a source-duration limit.
- Leave the source video unchanged.
- Treat asset creation and timeline insertion as one undoable operation.

## Non-goals

- Splitting, trimming, moving, or extending the source video.
- Ripple-editing later clips.
- Capturing the composited preview canvas, subtitles, or other tracks.
- Adding a dedicated freeze-frame renderer or timeline element type.
- Deduplicating repeated captures of the same frame.

## User Interaction

### Entry points

Both entry points invoke a single `freeze-frame` action:

- The Freeze item in a video clip's context menu passes the clicked track and
  element as the source.
- The snowflake toolbar button uses the currently selected video clip.

The toolbar action is available only when exactly one video clip is selected.
For either entry point, the playhead must satisfy
`startTime <= playhead < startTime + duration`. Otherwise the action does not
run and gives validation feedback.

While a capture is running, another freeze request is ignored and the loading
toast remains visible. Success selects the inserted image clip without opening
or switching the media panel. Failure replaces the loading toast with an error
and leaves no new asset or clip.

### Result

- The generated clip starts at the playhead and lasts three seconds.
- It copies the source video's transform and opacity, including position,
  scale, rotation, and flips. The generated asset itself remains an untransformed
  source frame.
- The source video is not split, moved, trimmed, or otherwise changed.
- Repeating the action later creates another independent image asset.

## Frame Selection

The frame timestamp must match the renderer's existing local-time semantics.
For timeline time `t`:

```text
elapsed = t - video.startTime
rate = video.playbackRate ?? 1

forward: video.trimStart + elapsed * rate
reverse: video.trimStart + rate * (video.duration - elapsed)
```

The calculation should live in shared timeline domain logic and be used by
both the video renderer and freeze-frame capture so trim, speed changes, and
reverse playback cannot drift between preview and capture.

Use the existing Mediabunny frame decoding path to obtain the sample displayed
at that timestamp. Draw it at its native dimensions and encode it as a lossless
PNG. Do not reuse the existing thumbnail output because thumbnails are reduced
to 1280x720 and JPEG quality 0.8.

The resulting `File` and `MediaAsset` use:

- MIME type `image/png`
- native frame width and height
- a name based on the source clip and capture timestamp
- no `ephemeral` flag, so the asset remains visible and reusable in the media
  library

## Timeline Placement

The target interval is `[playhead, playhead + 3 seconds)`.

Starting with the track immediately above the source track, search upward for
the nearest video track whose elements do not overlap that interval. Insert the
image there. Tracks below the source are not candidates.

If no existing video track above is available, create a non-main video track
immediately above the source track and insert the image into it. This preserves
the requested visual stacking and never shifts existing elements in time.

The inserted value is a regular `ImageElement` built through the existing image
element helper, with:

- `mediaId` referencing the generated asset
- `startTime` equal to the playhead
- `duration` equal to three seconds
- zero trims
- source transform and opacity copied onto the image
- `hidden` set to false

Existing image resize behavior already has no media-duration ceiling, so no
special extension logic is required.

## Action and Command Flow

```text
context menu / snowflake button
  -> freeze-frame action
  -> validate source and playhead
  -> decode native frame and create PNG File
  -> persist the asset
  -> execute one command batch
       add image asset
       optionally add video track above source
       insert ImageElement
  -> select inserted element
```

Frame decoding and the initial storage write finish before timeline state is
mutated. If either fails, the command is never committed.

The media addition, optional track addition, and element insertion are grouped
under one history entry using the existing command system. Undo removes the
clip, any track created solely for it, and the generated asset. Redo restores
the same asset and element IDs from the retained `File`; it does not decode the
video again.

If a synchronous command commit unexpectedly fails after persistence, delete
the newly persisted asset before reporting the error.

## Rendering and Export

No new rendering behavior is required. Preview and export already resolve
`ImageElement.mediaId` and render an image for the element's timeline duration.
Because stretching changes only the image element duration, a single generated
asset can fill an arbitrarily long gap without duplicating image data.

## Validation

Add one focused test module covering the non-trivial domain decisions:

- local frame time for normal, trimmed, speed-adjusted, and reversed video
- nearest non-overlapping video track above the source, including creation of a
  new track when none is available

Then verify manually that both UI entry points create the same result, the
source video remains unchanged, the image can be stretched, preview/export show
the still frame, one undo removes both outputs, redo restores them, and a forced
decode/storage failure leaves no partial result.

## Alternatives Rejected

### Dedicated freeze-frame element

Keeping a video reference and source timestamp in a new element would require
changes across timeline types, preview, export, serialization, and media
generation. It adds no value after a reusable image asset has already been
requested.

### Frozen range inside a video element

A frozen range fits a hold-frame effect but not a standalone image asset or an
independent clip intended to fill arbitrary gaps. It would also couple the
result to the source video's lifetime.
