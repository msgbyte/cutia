"use client";

import { memo, useRef, useEffect, useCallback } from "react";
import { renderTrackFrame } from "@/lib/timeline-renderer";
import type { TimelineTrack } from "@/types/timeline";
import type { MediaFile } from "@/types/media";

interface TrackCanvasProps {
  track: TimelineTrack;
  currentTime: number;
  width: number;
  height: number;
  mediaFiles: MediaFile[];
  projectCanvasSize: { width: number; height: number };
  zIndex: number;
}

function TrackCanvasComponent({
  track,
  currentTime,
  width,
  height,
  mediaFiles,
  projectCanvasSize,
  zIndex,
}: TrackCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const renderingRef = useRef(false);
  const pendingRenderRef = useRef(false);

  const doRender = useCallback(async () => {
    const canvas = canvasRef.current;
    if (!canvas || width <= 0 || height <= 0) return;

    const displayWidth = Math.max(1, Math.floor(width));
    const displayHeight = Math.max(1, Math.floor(height));

    if (canvas.width !== displayWidth || canvas.height !== displayHeight) {
      canvas.width = displayWidth;
      canvas.height = displayHeight;
    }

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    if (renderingRef.current) {
      pendingRenderRef.current = true;
      return;
    }
    renderingRef.current = true;
    pendingRenderRef.current = false;

    try {
      await renderTrackFrame({
        ctx,
        time: currentTime,
        canvasWidth: displayWidth,
        canvasHeight: displayHeight,
        track,
        mediaFiles,
        projectCanvasSize,
      });
    } finally {
      renderingRef.current = false;
      if (pendingRenderRef.current) {
        pendingRenderRef.current = false;
        doRender();
      }
    }
  }, [track, currentTime, width, height, mediaFiles, projectCanvasSize]);

  useEffect(() => {
    doRender();
  }, [doRender]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "absolute",
        left: 0,
        top: 0,
        width,
        height,
        zIndex,
        pointerEvents: "none",
      }}
      aria-label={`Track layer: ${track.name}`}
    />
  );
}

export const TrackCanvas = memo(
  TrackCanvasComponent,
  (prevProps, nextProps) => {
    // Custom comparison for better performance
    if (prevProps.currentTime !== nextProps.currentTime) return false;
    if (prevProps.width !== nextProps.width) return false;
    if (prevProps.height !== nextProps.height) return false;
    if (prevProps.zIndex !== nextProps.zIndex) return false;
    if (prevProps.projectCanvasSize.width !== nextProps.projectCanvasSize.width)
      return false;
    if (
      prevProps.projectCanvasSize.height !== nextProps.projectCanvasSize.height
    )
      return false;

    // Check if mediaFiles reference changed (for preload completion trigger)
    if (prevProps.mediaFiles !== nextProps.mediaFiles) return false;

    // Deep compare track elements
    if (prevProps.track.id !== nextProps.track.id) return false;
    if (prevProps.track.elements.length !== nextProps.track.elements.length)
      return false;

    // Check if any element in this track changed
    for (let i = 0; i < prevProps.track.elements.length; i++) {
      const prev = prevProps.track.elements[i];
      const next = nextProps.track.elements[i];
      if (prev !== next) return false;
    }

    // Check if relevant media files changed
    const prevMediaIds = new Set(
      prevProps.track.elements
        .filter((e) => e.type === "media")
        .map((e) => e.mediaId)
    );
    const nextMediaIds = new Set(
      nextProps.track.elements
        .filter((e) => e.type === "media")
        .map((e) => e.mediaId)
    );

    if (prevMediaIds.size !== nextMediaIds.size) return false;
    for (const id of prevMediaIds) {
      if (!nextMediaIds.has(id)) return false;
    }

    return true;
  }
);

TrackCanvas.displayName = "TrackCanvas";
