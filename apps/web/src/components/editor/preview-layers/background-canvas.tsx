"use client";

import { memo, useRef, useEffect, useCallback } from "react";
import { renderBackgroundFrame } from "@/lib/timeline-renderer";
import type { TimelineTrack } from "@/types/timeline";
import type { MediaFile } from "@/types/media";
import type { BlurIntensity } from "@/types/project";

interface BackgroundCanvasProps {
  tracks: TimelineTrack[];
  currentTime: number;
  width: number;
  height: number;
  mediaFiles: MediaFile[];
  backgroundColor?: string;
  backgroundType?: "color" | "blur";
  blurIntensity?: BlurIntensity;
}

function BackgroundCanvasComponent({
  tracks,
  currentTime,
  width,
  height,
  mediaFiles,
  backgroundColor,
  backgroundType,
  blurIntensity,
}: BackgroundCanvasProps) {
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
      await renderBackgroundFrame({
        ctx,
        time: currentTime,
        canvasWidth: displayWidth,
        canvasHeight: displayHeight,
        tracks,
        mediaFiles,
        backgroundColor,
        backgroundType,
        blurIntensity,
      });
    } finally {
      renderingRef.current = false;
      if (pendingRenderRef.current) {
        pendingRenderRef.current = false;
        doRender();
      }
    }
  }, [
    tracks,
    currentTime,
    width,
    height,
    mediaFiles,
    backgroundColor,
    backgroundType,
    blurIntensity,
  ]);

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
        zIndex: 0,
        pointerEvents: "none",
      }}
      aria-label="Background layer"
    />
  );
}

export const BackgroundCanvas = memo(
  BackgroundCanvasComponent,
  (prevProps, nextProps) => {
    if (prevProps.currentTime !== nextProps.currentTime) return false;
    if (prevProps.width !== nextProps.width) return false;
    if (prevProps.height !== nextProps.height) return false;
    if (prevProps.backgroundColor !== nextProps.backgroundColor) return false;
    if (prevProps.backgroundType !== nextProps.backgroundType) return false;
    if (prevProps.blurIntensity !== nextProps.blurIntensity) return false;

    // Check if mediaFiles reference changed (for preload completion trigger)
    if (prevProps.mediaFiles !== nextProps.mediaFiles) return false;

    // For blur background, we need to check if any video/image element changed
    if (prevProps.backgroundType === "blur") {
      if (prevProps.tracks.length !== nextProps.tracks.length) return false;
      // Simple reference check for tracks
      for (let i = 0; i < prevProps.tracks.length; i++) {
        if (prevProps.tracks[i] !== nextProps.tracks[i]) return false;
      }
    }

    return true;
  }
);

BackgroundCanvas.displayName = "BackgroundCanvas";
