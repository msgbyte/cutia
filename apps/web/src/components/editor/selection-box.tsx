"use client";

import { useMemo } from "react";

interface SelectionBoxProps {
	startPos: { x: number; y: number } | null;
	currentPos: { x: number; y: number } | null;
	containerRef: React.RefObject<HTMLElement | null>;
	isActive: boolean;
}

export function SelectionBox({
	startPos,
	currentPos,
	containerRef,
	isActive,
}: SelectionBoxProps) {
	const selectionBoxStyle = useMemo(() => {
		if (!isActive || !startPos || !currentPos || !containerRef.current) {
			return null;
		}

		const containerRect = containerRef.current.getBoundingClientRect();
		const startX = startPos.x - containerRect.left;
		const startY = startPos.y - containerRect.top;
		const currentX = currentPos.x - containerRect.left;
		const currentY = currentPos.y - containerRect.top;

		const left = Math.min(startX, currentX);
		const top = Math.min(startY, currentY);
		const width = Math.abs(currentX - startX);
		const height = Math.abs(currentY - startY);

		return {
			left: `${left}px`,
			top: `${top}px`,
			width: `${width}px`,
			height: `${height}px`,
		};
	}, [containerRef, currentPos, isActive, startPos]);

	if (!selectionBoxStyle) return null;

	return (
		<div
			style={selectionBoxStyle}
			className="border-foreground/50 bg-foreground/5 pointer-events-none absolute z-50 border"
		/>
	);
}
