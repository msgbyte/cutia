import type { TextElement } from "@/types/timeline";
import { TIMELINE_CONSTANTS } from "./timeline-constants";

export type TextStyleCategory =
	| "popular"
	| "subtitle"
	| "title"
	| "social"
	| "creative"
	| "minimal"
	| "emphasis";

export type TextStylePreset = Omit<
	TextElement,
	"id" | "startTime" | "trimStart" | "trimEnd" | "duration"
> & {
	presetId: string;
	presetName: string;
	category: TextStyleCategory;
};

export const TEXT_STYLE_CATEGORIES: Record<TextStyleCategory, string> = {
	popular: "Popular",
	subtitle: "Subtitles",
	title: "Titles",
	social: "Social",
	creative: "Creative",
	minimal: "Minimal",
	emphasis: "Emphasis",
};

function buildPreset({
	presetId,
	presetName,
	category,
	content,
	fontSize,
	fontFamily = "Arial",
	color = "#ffffff",
	backgroundColor = "transparent",
	textAlign = "center",
	fontWeight = "normal",
	fontStyle = "normal",
	textDecoration = "none",
	opacity = 1,
	x = 0,
	y = 0,
	rotate = 0,
	scale = 1,
}: {
	presetId: string;
	presetName: string;
	category: TextStyleCategory;
	content: string;
	fontSize: number;
	fontFamily?: string;
	color?: string;
	backgroundColor?: string;
	textAlign?: "left" | "center" | "right";
	fontWeight?: "normal" | "bold";
	fontStyle?: "normal" | "italic";
	textDecoration?: "none" | "underline" | "line-through";
	opacity?: number;
	x?: number;
	y?: number;
	rotate?: number;
	scale?: number;
}): TextStylePreset {
	return {
		presetId,
		presetName,
		category,
		type: "text",
		name: "Text",
		content,
		fontSize,
		fontFamily,
		color,
		backgroundColor,
		textAlign,
		fontWeight,
		fontStyle,
		textDecoration,
		opacity,
		transform: {
			scale,
			position: { x, y },
			rotate,
		},
	};
}

export const TEXT_STYLE_PRESETS: TextStylePreset[] = [
	// Popular styles
	buildPreset({
		presetId: "pop-bold-white",
		presetName: "Bold White",
		category: "popular",
		content: "Your text here",
		fontSize: 64,
		fontFamily: "Inter",
		fontWeight: "bold",
	}),
	buildPreset({
		presetId: "pop-shadow-box",
		presetName: "Shadow Box",
		category: "popular",
		content: "Your text here",
		fontSize: 56,
		backgroundColor: "rgba(0, 0, 0, 0.8)",
		fontWeight: "bold",
	}),
	buildPreset({
		presetId: "pop-neon-pink",
		presetName: "Neon Pink",
		category: "popular",
		content: "Your text here",
		fontSize: 60,
		fontFamily: "Impact",
		color: "#ff00ff",
		fontWeight: "bold",
	}),
	buildPreset({
		presetId: "pop-yellow-highlight",
		presetName: "Yellow Highlight",
		category: "popular",
		content: "Your text here",
		fontSize: 52,
		color: "#000000",
		backgroundColor: "#ffff00",
		fontWeight: "bold",
	}),

	// Subtitle styles
	buildPreset({
		presetId: "sub-classic",
		presetName: "Classic",
		category: "subtitle",
		content: "Subtitle text",
		fontSize: 48,
		fontWeight: "bold",
		y: 350,
	}),
	buildPreset({
		presetId: "sub-thin-stroke",
		presetName: "Thin Stroke",
		category: "subtitle",
		content: "Subtitle text",
		fontSize: 44,
		y: 350,
	}),
	buildPreset({
		presetId: "sub-bold-stroke",
		presetName: "Bold Stroke",
		category: "subtitle",
		content: "Subtitle text",
		fontSize: 52,
		fontFamily: "Impact",
		fontWeight: "bold",
		y: 350,
	}),
	buildPreset({
		presetId: "sub-yellow",
		presetName: "Yellow Sub",
		category: "subtitle",
		content: "Subtitle text",
		fontSize: 48,
		color: "#ffff00",
		fontWeight: "bold",
		y: 350,
	}),
	buildPreset({
		presetId: "sub-cinema",
		presetName: "Cinema",
		category: "subtitle",
		content: "Subtitle text",
		fontSize: 40,
		fontFamily: "Times New Roman",
		fontStyle: "italic",
		y: 380,
	}),
	buildPreset({
		presetId: "sub-modern",
		presetName: "Modern",
		category: "subtitle",
		content: "Subtitle text",
		fontSize: 44,
		fontFamily: "Helvetica",
		fontWeight: "bold",
		y: 350,
	}),

	// Title styles
	buildPreset({
		presetId: "title-big-impact",
		presetName: "Big Impact",
		category: "title",
		content: "TITLE",
		fontSize: 96,
		fontFamily: "Impact",
		fontWeight: "bold",
	}),
	buildPreset({
		presetId: "title-elegant",
		presetName: "Elegant",
		category: "title",
		content: "Elegant Title",
		fontSize: 72,
		fontFamily: "Georgia",
		fontStyle: "italic",
	}),
	buildPreset({
		presetId: "title-modern-serif",
		presetName: "Modern Serif",
		category: "title",
		content: "Modern Title",
		fontSize: 68,
		fontFamily: "Times New Roman",
		fontWeight: "bold",
	}),
	buildPreset({
		presetId: "title-underlined",
		presetName: "Underlined",
		category: "title",
		content: "Title Here",
		fontSize: 64,
		fontWeight: "bold",
		textDecoration: "underline",
	}),

	// Social media styles
	buildPreset({
		presetId: "social-tiktok",
		presetName: "TikTok Style",
		category: "social",
		content: "POV:",
		fontSize: 48,
		backgroundColor: "rgba(0, 0, 0, 0.6)",
		fontWeight: "bold",
		y: -300,
	}),
	buildPreset({
		presetId: "social-youtube",
		presetName: "YouTube",
		category: "social",
		content: "SUBSCRIBE",
		fontSize: 44,
		backgroundColor: "#ff0000",
		fontWeight: "bold",
		y: 350,
	}),
	buildPreset({
		presetId: "social-instagram",
		presetName: "Instagram",
		category: "social",
		content: "@username",
		fontSize: 40,
		fontFamily: "Helvetica",
		backgroundColor: "rgba(131, 58, 180, 0.9)",
		y: 380,
	}),
	buildPreset({
		presetId: "social-hashtag",
		presetName: "Hashtag",
		category: "social",
		content: "#trending",
		fontSize: 44,
		color: "#1da1f2",
		fontWeight: "bold",
	}),

	// Creative styles
	buildPreset({
		presetId: "creative-neon-blue",
		presetName: "Neon Blue",
		category: "creative",
		content: "GLOW",
		fontSize: 72,
		fontFamily: "Impact",
		color: "#00ffff",
		fontWeight: "bold",
	}),
	buildPreset({
		presetId: "creative-neon-green",
		presetName: "Neon Green",
		category: "creative",
		content: "NEON",
		fontSize: 72,
		fontFamily: "Impact",
		color: "#00ff00",
		fontWeight: "bold",
	}),
	buildPreset({
		presetId: "creative-retro",
		presetName: "Retro",
		category: "creative",
		content: "RETRO",
		fontSize: 64,
		fontFamily: "Courier New",
		color: "#ff6b35",
		fontWeight: "bold",
	}),
	buildPreset({
		presetId: "creative-glitch",
		presetName: "Glitch",
		category: "creative",
		content: "GLITCH",
		fontSize: 68,
		fontFamily: "Impact",
		color: "#ff0066",
		fontWeight: "bold",
		rotate: -2,
	}),
	buildPreset({
		presetId: "creative-comic",
		presetName: "Comic",
		category: "creative",
		content: "POW!",
		fontSize: 80,
		fontFamily: "Impact",
		color: "#ffcc00",
		backgroundColor: "#ff0000",
		fontWeight: "bold",
		rotate: -5,
	}),
	buildPreset({
		presetId: "creative-handwritten",
		presetName: "Handwritten",
		category: "creative",
		content: "hello",
		fontSize: 56,
		fontFamily: "Comic Sans MS",
		rotate: 3,
	}),

	// Minimal styles
	buildPreset({
		presetId: "minimal-clean",
		presetName: "Clean",
		category: "minimal",
		content: "Clean Text",
		fontSize: 48,
		fontFamily: "Helvetica",
		opacity: 0.9,
	}),
	buildPreset({
		presetId: "minimal-thin",
		presetName: "Thin",
		category: "minimal",
		content: "Thin Text",
		fontSize: 52,
		opacity: 0.8,
	}),
	buildPreset({
		presetId: "minimal-lowercase",
		presetName: "Lowercase",
		category: "minimal",
		content: "minimal style",
		fontSize: 44,
		fontFamily: "Helvetica",
		color: "#cccccc",
	}),
	buildPreset({
		presetId: "minimal-subtle",
		presetName: "Subtle",
		category: "minimal",
		content: "subtle",
		fontSize: 40,
		fontFamily: "Georgia",
		color: "#888888",
		fontStyle: "italic",
		opacity: 0.7,
	}),

	// Emphasis styles
	buildPreset({
		presetId: "emphasis-alert",
		presetName: "Alert",
		category: "emphasis",
		content: "ALERT!",
		fontSize: 64,
		fontFamily: "Impact",
		backgroundColor: "#ff0000",
		fontWeight: "bold",
	}),
	buildPreset({
		presetId: "emphasis-breaking",
		presetName: "Breaking News",
		category: "emphasis",
		content: "BREAKING",
		fontSize: 56,
		backgroundColor: "#cc0000",
		fontWeight: "bold",
		y: -380,
	}),
	buildPreset({
		presetId: "emphasis-important",
		presetName: "Important",
		category: "emphasis",
		content: "IMPORTANT",
		fontSize: 52,
		color: "#000000",
		backgroundColor: "#ffd700",
		fontWeight: "bold",
	}),
	buildPreset({
		presetId: "emphasis-sale",
		presetName: "Sale",
		category: "emphasis",
		content: "50% OFF",
		fontSize: 72,
		fontFamily: "Impact",
		backgroundColor: "#e63946",
		fontWeight: "bold",
		rotate: -10,
	}),
	buildPreset({
		presetId: "emphasis-new",
		presetName: "New Badge",
		category: "emphasis",
		content: "NEW",
		fontSize: 40,
		backgroundColor: "#00cc00",
		fontWeight: "bold",
		x: 300,
		y: -300,
		rotate: 15,
	}),
];

export function createTextFromPreset({
	preset,
	startTime = 0,
}: {
	preset: TextStylePreset;
	startTime?: number;
}): Omit<TextElement, "id"> {
	const { presetId: _presetId, presetName: _presetName, category: _category, ...elementProps } = preset;
	return {
		...elementProps,
		duration: TIMELINE_CONSTANTS.DEFAULT_ELEMENT_DURATION,
		startTime,
		trimStart: 0,
		trimEnd: 0,
	};
}

export function getPresetsByCategory({
	category,
}: {
	category: TextStyleCategory;
}): TextStylePreset[] {
	return TEXT_STYLE_PRESETS.filter((preset) => preset.category === category);
}
