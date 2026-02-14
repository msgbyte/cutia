import { useState } from "react";
import { DraggableItem } from "@/components/editor/panels/assets/draggable-item";
import { PanelBaseView as BaseView } from "@/components/editor/panels/panel-base-view";
import { useEditor } from "@/hooks/use-editor";
import { DEFAULT_TEXT_ELEMENT } from "@/constants/text-constants";
import { buildTextElement } from "@/lib/timeline/element-utils";
import {
	TEXT_STYLE_PRESETS,
	TEXT_STYLE_CATEGORIES,
	createTextFromPreset,
	type TextStyleCategory,
} from "@/constants/text-style-presets";
import { cn } from "@/utils/ui";

const CATEGORY_KEYS = Object.keys(TEXT_STYLE_CATEGORIES) as TextStyleCategory[];

export function TextView() {
	const editor = useEditor();
	const [activeCategory, setActiveCategory] =
		useState<TextStyleCategory>("popular");

	const handleAddDefaultText = ({
		currentTime,
	}: {
		currentTime: number;
	}) => {
		const activeScene = editor.scenes.getActiveScene();
		if (!activeScene) return;

		const element = buildTextElement({
			raw: DEFAULT_TEXT_ELEMENT,
			startTime: currentTime,
		});

		editor.timeline.insertElement({
			element,
			placement: { mode: "auto" },
		});
	};

	const handleAddPreset = ({
		presetId,
		currentTime,
	}: {
		presetId: string;
		currentTime: number;
	}) => {
		const activeScene = editor.scenes.getActiveScene();
		if (!activeScene) return;

		const preset = TEXT_STYLE_PRESETS.find((p) => p.presetId === presetId);
		if (!preset) return;

		const raw = createTextFromPreset({ preset, startTime: currentTime });
		const element = buildTextElement({
			raw,
			startTime: currentTime,
		});

		editor.timeline.insertElement({
			element,
			placement: { mode: "auto" },
		});
	};

	const filteredPresets = TEXT_STYLE_PRESETS.filter(
		(preset) => preset.category === activeCategory,
	);

	return (
		<BaseView>
			<div className="space-y-3">
				{/* Default text */}
				<DraggableItem
					name="Default text"
					preview={
						<div className="bg-accent flex size-full items-center justify-center rounded">
							<span className="text-xs select-none">Default text</span>
						</div>
					}
					dragData={{
						id: "temp-text-id",
						type: DEFAULT_TEXT_ELEMENT.type,
						name: DEFAULT_TEXT_ELEMENT.name,
						content: DEFAULT_TEXT_ELEMENT.content,
					}}
					aspectRatio={1}
					onAddToTimeline={handleAddDefaultText}
					shouldShowLabel={false}
				/>

				{/* Category tabs */}
				<div className="flex flex-wrap gap-1 px-1">
					{CATEGORY_KEYS.map((category) => (
						<button
							key={category}
							type="button"
							className={cn(
								"rounded-full px-2.5 py-1 text-[0.65rem] font-medium transition-colors",
								activeCategory === category
									? "bg-primary text-primary-foreground"
									: "bg-accent text-muted-foreground hover:text-foreground",
							)}
							onClick={() => setActiveCategory(category)}
						>
							{TEXT_STYLE_CATEGORIES[category]}
						</button>
					))}
				</div>

				{/* Preset grid */}
				<div className="grid grid-cols-2 gap-2 px-1">
					{filteredPresets.map((preset) => (
						<button
							key={preset.presetId}
							type="button"
							className="bg-accent hover:bg-accent/80 group relative flex aspect-video cursor-pointer items-center justify-center overflow-hidden rounded-md border transition-colors"
							onClick={() =>
								handleAddPreset({
									presetId: preset.presetId,
									currentTime: editor.playback.getCurrentTime(),
								})
							}
						>
							<div
								className="flex size-full items-center justify-center p-2"
								style={{ backgroundColor: "rgba(0,0,0,0.8)" }}
							>
								<span
									className="max-w-full truncate text-center leading-tight select-none"
									style={{
										color: preset.color,
										fontFamily: preset.fontFamily,
										fontWeight: preset.fontWeight,
										fontStyle: preset.fontStyle,
										textDecoration: preset.textDecoration,
										fontSize: `${Math.min(preset.fontSize / 4, 16)}px`,
										backgroundColor:
											preset.backgroundColor !== "transparent"
												? preset.backgroundColor
												: undefined,
										padding:
											preset.backgroundColor !== "transparent"
												? "2px 6px"
												: undefined,
										borderRadius:
											preset.backgroundColor !== "transparent"
												? "2px"
												: undefined,
										transform:
											preset.transform.rotate !== 0
												? `rotate(${preset.transform.rotate}deg)`
												: undefined,
									}}
								>
									{preset.content}
								</span>
							</div>
							<span className="absolute inset-x-0 bottom-0 bg-black/60 px-1 py-0.5 text-center text-[0.6rem] text-white opacity-0 transition-opacity group-hover:opacity-100">
								{preset.presetName}
							</span>
						</button>
					))}
				</div>
			</div>
		</BaseView>
	);
}
