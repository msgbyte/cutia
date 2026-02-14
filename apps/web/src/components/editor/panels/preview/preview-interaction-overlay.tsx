import { useRef } from "react";
import { usePreviewInteraction } from "@/hooks/use-preview-interaction";
import { SelectionOverlay } from "./selection-overlay";

export function PreviewInteractionOverlay({
	canvasRef,
	displaySize,
}: {
	canvasRef: React.RefObject<HTMLCanvasElement | null>;
	displaySize: { width: number; height: number };
}) {
	const overlayRef = useRef<HTMLDivElement>(null);
	const {
		onPointerDown,
		onPointerMove,
		onPointerUp,
		onScaleStart,
		isTransforming,
	} = usePreviewInteraction({ canvasRef, overlayRef });

	return (
		<div
			ref={overlayRef}
			className="pointer-events-auto absolute inset-0"
			onPointerDown={onPointerDown}
			onPointerMove={onPointerMove}
			onPointerUp={onPointerUp}
		>
			<SelectionOverlay
				displaySize={displaySize}
				onScaleStart={onScaleStart}
				isTransforming={isTransforming}
			/>
		</div>
	);
}
