import type { TextElement } from "@/types/timeline";
import { TIMELINE_CONSTANTS } from "./timeline-constants";

export const MIN_FONT_SIZE = 5;
export const MAX_FONT_SIZE = 300;

/**
 * higher value: smaller font size
 * lower value: larger font size
 */
export const FONT_SIZE_SCALE_REFERENCE = 90;

export const DEFAULT_TEXT_ELEMENT: Omit<TextElement, "id"> = {
	type: "text",
	name: "Text",
	content: "Default text",
	fontSize: 15,
	fontFamily: "Arial",
	color: "#ffffff",
	backgroundColor: "transparent",
	textAlign: "center",
	fontWeight: "normal",
	fontStyle: "normal",
	textDecoration: "none",
	duration: TIMELINE_CONSTANTS.DEFAULT_ELEMENT_DURATION,
	startTime: 0,
	trimStart: 0,
	trimEnd: 0,
	transform: {
		scale: 1,
		position: {
			x: 0,
			y: 0,
		},
		rotate: 0,
	},
	opacity: 1,
};
