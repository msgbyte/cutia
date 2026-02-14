"use client";

import { useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useEditor } from "@/hooks/use-editor";
import {
	TRANSITION_PRESETS,
	TRANSITION_CATEGORIES,
	TRANSITION_CATEGORY_LABELS,
	DEFAULT_TRANSITION_DURATION,
	type TransitionPreset,
} from "@/constants/transition-constants";
import type { TransitionType, VideoTrack } from "@/types/timeline";
import { toast } from "sonner";
import { cn } from "@/utils/ui";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { findAdjacentPairs } from "@/lib/timeline/transition-utils";

export function TransitionsView() {
	const [selectedCategory, setSelectedCategory] = useState<string>("all");

	const filteredPresets =
		selectedCategory === "all"
			? TRANSITION_PRESETS
			: TRANSITION_PRESETS.filter(
					(preset) => preset.category === selectedCategory,
				);

	return (
		<div className="flex h-full flex-col">
			<div className="border-b px-4 pt-3 pb-2">
				<h3 className="mb-2 text-sm font-medium">Transitions</h3>
				<p className="text-muted-foreground mb-2 text-xs">
					Click a transition to apply it to adjacent clips. You can also click the junction icon between clips on the timeline.
				</p>
				<div className="flex flex-wrap gap-1">
					<CategoryPill
						label="All"
						isActive={selectedCategory === "all"}
						onClick={() => setSelectedCategory("all")}
					/>
					{TRANSITION_CATEGORIES.map((category) => (
						<CategoryPill
							key={category}
							label={TRANSITION_CATEGORY_LABELS[category]}
							isActive={selectedCategory === category}
							onClick={() => setSelectedCategory(category)}
						/>
					))}
				</div>
			</div>
			<ScrollArea className="flex-1">
				<div className="grid grid-cols-2 gap-2 p-4">
					{filteredPresets.map((preset) => (
						<TransitionPresetCard key={preset.type} preset={preset} />
					))}
				</div>
			</ScrollArea>
		</div>
	);
}

function CategoryPill({
	label,
	isActive,
	onClick,
}: {
	label: string;
	isActive: boolean;
	onClick: () => void;
}) {
	return (
		<button
			type="button"
			className={cn(
				"rounded-full px-3 py-1 text-xs font-medium transition-colors",
				isActive
					? "bg-primary text-primary-foreground"
					: "bg-muted text-muted-foreground hover:bg-accent",
			)}
			onClick={onClick}
		>
			{label}
		</button>
	);
}

function TransitionPresetCard({ preset }: { preset: TransitionPreset }) {
	const editor = useEditor();

	const handleApplyTransition = () => {
		applyTransitionToAdjacentPairs({
			editor,
			transitionType: preset.type,
		});
	};

	return (
		<TooltipProvider>
			<Tooltip>
				<TooltipTrigger asChild>
					<button
						type="button"
						className="bg-muted hover:bg-accent flex flex-col items-center gap-2 rounded-lg border p-3 transition-colors"
						onClick={handleApplyTransition}
					>
						<TransitionPreview type={preset.type} />
						<span className="text-xs font-medium">{preset.label}</span>
					</button>
				</TooltipTrigger>
				<TooltipContent>
					<p>Apply {preset.label} transition to all adjacent clip junctions</p>
				</TooltipContent>
			</Tooltip>
		</TooltipProvider>
	);
}

function TransitionPreview({ type }: { type: TransitionType }) {
	return (
		<div className="relative flex h-10 w-full items-center justify-center overflow-hidden rounded">
			<TransitionIcon type={type} />
		</div>
	);
}

function TransitionIcon({ type }: { type: TransitionType }) {
	const baseClass = "size-full";
	const label = TRANSITION_PRESETS.find((p) => p.type === type)?.label ?? type;

	if (type === "fade" || type === "dissolve") {
		return (
			<svg viewBox="0 0 60 30" className={baseClass} role="img" aria-label={label}>
				<title>{label}</title>
				<defs>
					<linearGradient id={`grad-${type}`} x1="0" y1="0" x2="1" y2="0">
						<stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="1" />
						<stop
							offset="100%"
							stopColor="hsl(var(--primary))"
							stopOpacity={type === "dissolve" ? "0.3" : "0"}
						/>
					</linearGradient>
				</defs>
				<rect x="0" y="2" width="28" height="26" rx="2" fill={`url(#grad-${type})`} />
				<rect x="32" y="2" width="28" height="26" rx="2" fill="hsl(var(--muted-foreground))" opacity="0.3" />
			</svg>
		);
	}

	if (type.startsWith("wipe-")) {
		const direction = type.replace("wipe-", "");
		return (
			<svg viewBox="0 0 60 30" className={baseClass} role="img" aria-label={label}>
				<title>{label}</title>
				<rect x="2" y="2" width="26" height="26" rx="2" fill="hsl(var(--primary))" />
				<rect x="32" y="2" width="26" height="26" rx="2" fill="hsl(var(--muted-foreground))" opacity="0.3" />
				<path
					d={getArrowPath({ direction })}
					fill="none"
					stroke="hsl(var(--foreground))"
					strokeWidth="1.5"
					strokeLinecap="round"
					strokeLinejoin="round"
				/>
			</svg>
		);
	}

	if (type.startsWith("slide-")) {
		const direction = type.replace("slide-", "");
		return (
			<svg viewBox="0 0 60 30" className={baseClass} role="img" aria-label={label}>
				<title>{label}</title>
				<rect x="2" y="2" width="26" height="26" rx="2" fill="hsl(var(--primary))" />
				<rect x="32" y="2" width="26" height="26" rx="2" fill="hsl(var(--muted-foreground))" opacity="0.3" />
				<path
					d={getArrowPath({ direction })}
					fill="none"
					stroke="hsl(var(--foreground))"
					strokeWidth="1.5"
					strokeLinecap="round"
					strokeLinejoin="round"
					strokeDasharray="2 2"
				/>
			</svg>
		);
	}

	if (type === "zoom-in") {
		return (
			<svg viewBox="0 0 60 30" className={baseClass} role="img" aria-label={label}>
				<title>{label}</title>
				<rect x="2" y="2" width="26" height="26" rx="2" fill="hsl(var(--primary))" />
				<rect x="36" y="6" width="18" height="18" rx="2" fill="hsl(var(--muted-foreground))" opacity="0.3" />
				<rect x="34" y="4" width="22" height="22" rx="3" fill="none" stroke="hsl(var(--foreground))" strokeWidth="1" />
			</svg>
		);
	}

	if (type === "zoom-out") {
		return (
			<svg viewBox="0 0 60 30" className={baseClass} role="img" aria-label={label}>
				<title>{label}</title>
				<rect x="4" y="4" width="22" height="22" rx="2" fill="hsl(var(--primary))" />
				<rect x="2" y="2" width="26" height="26" rx="3" fill="none" stroke="hsl(var(--foreground))" strokeWidth="1" />
				<rect x="32" y="2" width="26" height="26" rx="2" fill="hsl(var(--muted-foreground))" opacity="0.3" />
			</svg>
		);
	}

	return (
		<svg viewBox="0 0 60 30" className={baseClass} role="img" aria-label={label}>
			<title>{label}</title>
			<rect x="2" y="2" width="26" height="26" rx="2" fill="hsl(var(--primary))" />
			<rect x="32" y="2" width="26" height="26" rx="2" fill="hsl(var(--muted-foreground))" opacity="0.3" />
		</svg>
	);
}

function getArrowPath({ direction }: { direction: string }): string {
	switch (direction) {
		case "left":
			return "M32 15 L25 15 M28 11 L25 15 L28 19";
		case "right":
			return "M28 15 L35 15 M32 11 L35 15 L32 19";
		case "up":
			return "M30 20 L30 13 M26 16 L30 13 L34 16";
		case "down":
			return "M30 10 L30 17 M26 14 L30 17 L34 14";
		default:
			return "M28 15 L35 15 M32 11 L35 15 L32 19";
	}
}

function applyTransitionToAdjacentPairs({
	editor,
	transitionType,
}: {
	editor: ReturnType<typeof useEditor>;
	transitionType: TransitionType;
}) {
	const tracks = editor.timeline.getTracks();
	let applied = 0;

	for (const track of tracks) {
		if (track.type !== "video") continue;

		const videoTrack = track as VideoTrack;
		const pairs = findAdjacentPairs({ track: videoTrack });

		for (const pair of pairs) {
			const result = editor.timeline.addTransition({
				trackId: track.id,
				fromElementId: pair.from.id,
				toElementId: pair.to.id,
				type: transitionType,
				duration: DEFAULT_TRANSITION_DURATION,
			});
			if (result) applied++;
		}
	}

	if (applied === 0) {
		toast.info("No adjacent clips found. Place clips next to each other on a video track first.");
	} else {
		toast.success(`Applied ${transitionType} to ${applied} junction(s)`);
	}
}
