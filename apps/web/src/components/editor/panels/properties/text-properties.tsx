import { Textarea } from "@/components/ui/textarea";
import { FontPicker } from "@/components/ui/font-picker";
import type { FontFamily } from "@/constants/font-constants";
import type { TextElement, Transform } from "@/types/timeline";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useReducer, useRef } from "react";
import { PanelBaseView } from "@/components/editor/panels/panel-base-view";
import {
	PropertyGroup,
	PropertyItem,
	PropertyItemLabel,
	PropertyItemValue,
} from "./property-item";
import { ColorPicker } from "@/components/ui/color-picker";
import { uppercase } from "@/utils/string";
import { clamp } from "@/utils/math";
import { useEditor } from "@/hooks/use-editor";
import { DEFAULT_COLOR } from "@/constants/project-constants";
import { MIN_FONT_SIZE, MAX_FONT_SIZE } from "@/constants/text-constants";

export function TextProperties({
	element,
	trackId,
}: {
	element: TextElement;
	trackId: string;
}) {
	const editor = useEditor();
	const containerRef = useRef<HTMLDivElement>(null);
	const [, forceRender] = useReducer((x: number) => x + 1, 0);
	const isEditingFontSize = useRef(false);
	const isEditingOpacity = useRef(false);
	const isEditingContent = useRef(false);
	const isEditingPosX = useRef(false);
	const isEditingPosY = useRef(false);
	const isEditingScale = useRef(false);
	const isEditingRotation = useRef(false);
	const fontSizeDraft = useRef("");
	const opacityDraft = useRef("");
	const contentDraft = useRef("");
	const posXDraft = useRef("");
	const posYDraft = useRef("");
	const scaleDraft = useRef("");
	const rotationDraft = useRef("");

	const fontSizeDisplay = isEditingFontSize.current
		? fontSizeDraft.current
		: element.fontSize.toString();
	const opacityDisplay = isEditingOpacity.current
		? opacityDraft.current
		: Math.round(element.opacity * 100).toString();
	const contentDisplay = isEditingContent.current
		? contentDraft.current
		: element.content;

	const lastSelectedColor = useRef(DEFAULT_COLOR);
	const initialFontSizeRef = useRef<number | null>(null);
	const initialOpacityRef = useRef<number | null>(null);
	const initialContentRef = useRef<string | null>(null);
	const initialColorRef = useRef<string | null>(null);
	const initialBgColorRef = useRef<string | null>(null);
	const initialPosXRef = useRef<number | null>(null);
	const initialPosYRef = useRef<number | null>(null);
	const initialScaleRef = useRef<number | null>(null);
	const initialRotationRef = useRef<number | null>(null);

	const scalePercent = Math.round(element.transform.scale * 100);
	const posXDisplay = isEditingPosX.current
		? posXDraft.current
		: Math.round(element.transform.position.x).toString();
	const posYDisplay = isEditingPosY.current
		? posYDraft.current
		: Math.round(element.transform.position.y).toString();
	const scaleDisplay = isEditingScale.current
		? scaleDraft.current
		: scalePercent.toString();
	const rotationDisplay = isEditingRotation.current
		? rotationDraft.current
		: Math.round(element.transform.rotate).toString();

	const updateTransform = ({
		updates,
		pushHistory = true,
	}: {
		updates: Partial<Transform>;
		pushHistory?: boolean;
	}) => {
		editor.timeline.updateElements({
			updates: [
				{
					trackId,
					elementId: element.id,
					updates: {
						transform: { ...element.transform, ...updates },
					},
				},
			],
			pushHistory,
		});
	};

	const handleFontSizeChange = ({ value }: { value: string }) => {
		fontSizeDraft.current = value;
		forceRender();

		if (value.trim() !== "") {
			if (initialFontSizeRef.current === null) {
				initialFontSizeRef.current = element.fontSize;
			}
			const parsed = parseInt(value, 10);
			const fontSize = Number.isNaN(parsed)
				? element.fontSize
				: clamp({ value: parsed, min: MIN_FONT_SIZE, max: MAX_FONT_SIZE });
			editor.timeline.updateElements({
				updates: [{ trackId, elementId: element.id, updates: { fontSize } }],
				pushHistory: false,
			});
		}
	};

	const handleFontSizeBlur = () => {
		if (initialFontSizeRef.current !== null) {
			const parsed = parseInt(fontSizeDraft.current, 10);
			const fontSize = Number.isNaN(parsed)
				? element.fontSize
				: clamp({ value: parsed, min: MIN_FONT_SIZE, max: MAX_FONT_SIZE });
			editor.timeline.updateElements({
				updates: [
					{
						trackId,
						elementId: element.id,
						updates: { fontSize: initialFontSizeRef.current },
					},
				],
				pushHistory: false,
			});
			editor.timeline.updateElements({
				updates: [{ trackId, elementId: element.id, updates: { fontSize } }],
				pushHistory: true,
			});
			initialFontSizeRef.current = null;
		}
		isEditingFontSize.current = false;
		fontSizeDraft.current = "";
		forceRender();
	};

	const handleOpacityChange = ({ value }: { value: string }) => {
		opacityDraft.current = value;
		forceRender();

		if (value.trim() !== "") {
			if (initialOpacityRef.current === null) {
				initialOpacityRef.current = element.opacity;
			}
			const parsed = parseInt(value, 10);
			const opacityPercent = Number.isNaN(parsed)
				? Math.round(element.opacity * 100)
				: clamp({ value: parsed, min: 0, max: 100 });
			editor.timeline.updateElements({
				updates: [
					{
						trackId,
						elementId: element.id,
						updates: { opacity: opacityPercent / 100 },
					},
				],
				pushHistory: false,
			});
		}
	};

	const handleOpacityBlur = () => {
		if (initialOpacityRef.current !== null) {
			const parsed = parseInt(opacityDraft.current, 10);
			const opacityPercent = Number.isNaN(parsed)
				? Math.round(element.opacity * 100)
				: clamp({ value: parsed, min: 0, max: 100 });
			editor.timeline.updateElements({
				updates: [
					{
						trackId,
						elementId: element.id,
						updates: { opacity: initialOpacityRef.current },
					},
				],
				pushHistory: false,
			});
			editor.timeline.updateElements({
				updates: [
					{
						trackId,
						elementId: element.id,
						updates: { opacity: opacityPercent / 100 },
					},
				],
				pushHistory: true,
			});
			initialOpacityRef.current = null;
		}
		isEditingOpacity.current = false;
		opacityDraft.current = "";
		forceRender();
	};

	const handleColorChange = ({ color }: { color: string }) => {
		if (color !== "transparent") {
			lastSelectedColor.current = color;
		}
		if (initialBgColorRef.current === null) {
			initialBgColorRef.current = element.backgroundColor;
		}
		if (initialBgColorRef.current !== null) {
			editor.timeline.updateElements({
				updates: [
					{
						trackId,
						elementId: element.id,
						updates: { backgroundColor: color },
					},
				],
				pushHistory: false,
			});
		} else {
			editor.timeline.updateElements({
				updates: [
					{
						trackId,
						elementId: element.id,
						updates: { backgroundColor: color },
					},
				],
			});
		}
	};

	const handleColorChangeEnd = ({ color }: { color: string }) => {
		if (initialBgColorRef.current !== null) {
			editor.timeline.updateElements({
				updates: [
					{
						trackId,
						elementId: element.id,
						updates: { backgroundColor: initialBgColorRef.current },
					},
				],
				pushHistory: false,
			});
			editor.timeline.updateElements({
				updates: [
					{
						trackId,
						elementId: element.id,
						updates: { backgroundColor: `#${color}` },
					},
				],
				pushHistory: true,
			});
			initialBgColorRef.current = null;
		}
	};

	return (
		<div className="flex h-full flex-col" ref={containerRef}>
			<PanelBaseView className="p-0">
				<PropertyGroup title="Content" hasBorderTop={false} collapsible={false}>
					<Textarea
						placeholder="Name"
						value={contentDisplay}
						className="bg-accent min-h-20"
						onFocus={() => {
							isEditingContent.current = true;
							contentDraft.current = element.content;
							initialContentRef.current = element.content;
							forceRender();
						}}
						onChange={(event) => {
							contentDraft.current = event.target.value;
							forceRender();
							if (initialContentRef.current === null) {
								initialContentRef.current = element.content;
							}
							editor.timeline.updateElements({
								updates: [
									{
										trackId,
										elementId: element.id,
										updates: { content: event.target.value },
									},
								],
								pushHistory: false,
							});
						}}
						onBlur={() => {
							if (initialContentRef.current !== null) {
								const finalContent = contentDraft.current;
								editor.timeline.updateElements({
									updates: [
										{
											trackId,
											elementId: element.id,
											updates: { content: initialContentRef.current },
										},
									],
									pushHistory: false,
								});
								editor.timeline.updateElements({
									updates: [
										{
											trackId,
											elementId: element.id,
											updates: { content: finalContent },
										},
									],
									pushHistory: true,
								});
								initialContentRef.current = null;
							}
							isEditingContent.current = false;
							contentDraft.current = "";
							forceRender();
						}}
					/>
				</PropertyGroup>
				<PropertyGroup title="Typography" collapsible={false}>
					<div className="space-y-6">
						<PropertyItem direction="column">
							<PropertyItemLabel>Font</PropertyItemLabel>
							<PropertyItemValue>
								<FontPicker
									defaultValue={element.fontFamily}
									onValueChange={(value: FontFamily) =>
										editor.timeline.updateElements({
											updates: [
												{
													trackId,
													elementId: element.id,
													updates: { fontFamily: value },
												},
											],
										})
									}
								/>
							</PropertyItemValue>
						</PropertyItem>
						<PropertyItem direction="column">
							<PropertyItemLabel>Style</PropertyItemLabel>
							<PropertyItemValue>
								<div className="flex items-center gap-2">
									<Button
										variant={
											element.fontWeight === "bold" ? "default" : "outline"
										}
										size="sm"
										onClick={() =>
											editor.timeline.updateElements({
												updates: [
													{
														trackId,
														elementId: element.id,
														updates: {
															fontWeight:
																element.fontWeight === "bold"
																	? "normal"
																	: "bold",
														},
													},
												],
											})
										}
										className="h-8 px-3 font-bold"
									>
										B
									</Button>
									<Button
										variant={
											element.fontStyle === "italic" ? "default" : "outline"
										}
										size="sm"
										onClick={() =>
											editor.timeline.updateElements({
												updates: [
													{
														trackId,
														elementId: element.id,
														updates: {
															fontStyle:
																element.fontStyle === "italic"
																	? "normal"
																	: "italic",
														},
													},
												],
											})
										}
										className="h-8 px-3 italic"
									>
										I
									</Button>
									<Button
										variant={
											element.textDecoration === "underline"
												? "default"
												: "outline"
										}
										size="sm"
										onClick={() =>
											editor.timeline.updateElements({
												updates: [
													{
														trackId,
														elementId: element.id,
														updates: {
															textDecoration:
																element.textDecoration === "underline"
																	? "none"
																	: "underline",
														},
													},
												],
											})
										}
										className="h-8 px-3 underline"
									>
										U
									</Button>
									<Button
										variant={
											element.textDecoration === "line-through"
												? "default"
												: "outline"
										}
										size="sm"
										onClick={() =>
											editor.timeline.updateElements({
												updates: [
													{
														trackId,
														elementId: element.id,
														updates: {
															textDecoration:
																element.textDecoration === "line-through"
																	? "none"
																	: "line-through",
														},
													},
												],
											})
										}
										className="h-8 px-3 line-through"
									>
										S
									</Button>
								</div>
							</PropertyItemValue>
						</PropertyItem>
						<PropertyItem direction="column">
							<PropertyItemLabel>Font size</PropertyItemLabel>
							<PropertyItemValue>
								<div className="flex items-center gap-2">
									<Slider
										value={[element.fontSize]}
										min={MIN_FONT_SIZE}
										max={MAX_FONT_SIZE}
										step={1}
										onValueChange={([value]) => {
											if (initialFontSizeRef.current === null) {
												initialFontSizeRef.current = element.fontSize;
											}
											editor.timeline.updateElements({
												updates: [
													{
														trackId,
														elementId: element.id,
														updates: { fontSize: value },
													},
												],
												pushHistory: false,
											});
										}}
										onValueCommit={([value]) => {
											if (initialFontSizeRef.current !== null) {
												editor.timeline.updateElements({
													updates: [
														{
															trackId,
															elementId: element.id,
															updates: {
																fontSize: initialFontSizeRef.current,
															},
														},
													],
													pushHistory: false,
												});
												editor.timeline.updateElements({
													updates: [
														{
															trackId,
															elementId: element.id,
															updates: { fontSize: value },
														},
													],
													pushHistory: true,
												});
												initialFontSizeRef.current = null;
											}
										}}
										className="w-full"
									/>
									<Input
										type="number"
										value={fontSizeDisplay}
										min={MIN_FONT_SIZE}
										max={MAX_FONT_SIZE}
										onFocus={() => {
											isEditingFontSize.current = true;
											fontSizeDraft.current = element.fontSize.toString();
											forceRender();
										}}
										onChange={(e) =>
											handleFontSizeChange({ value: e.target.value })
										}
										onBlur={handleFontSizeBlur}
										className="bg-accent h-7 w-12 [appearance:textfield] rounded-sm px-2 text-center !text-xs [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
									/>
								</div>
							</PropertyItemValue>
						</PropertyItem>
					</div>
				</PropertyGroup>
				<PropertyGroup title="Appearance" collapsible={false}>
					<div className="space-y-6">
						<PropertyItem direction="column">
							<PropertyItemLabel>Color</PropertyItemLabel>
							<PropertyItemValue>
								<ColorPicker
									value={uppercase({
										string: (element.color || "FFFFFF").replace("#", ""),
									})}
									onChange={(color) => {
										if (initialColorRef.current === null) {
											initialColorRef.current = element.color || "#FFFFFF";
										}
										if (initialColorRef.current !== null) {
											editor.timeline.updateElements({
												updates: [
													{
														trackId,
														elementId: element.id,
														updates: { color: `#${color}` },
													},
												],
												pushHistory: false,
											});
										} else {
											editor.timeline.updateElements({
												updates: [
													{
														trackId,
														elementId: element.id,
														updates: { color: `#${color}` },
													},
												],
											});
										}
									}}
									onChangeEnd={(color) => {
										if (initialColorRef.current !== null) {
											editor.timeline.updateElements({
												updates: [
													{
														trackId,
														elementId: element.id,
														updates: { color: initialColorRef.current },
													},
												],
												pushHistory: false,
											});
											editor.timeline.updateElements({
												updates: [
													{
														trackId,
														elementId: element.id,
														updates: { color: `#${color}` },
													},
												],
												pushHistory: true,
											});
											initialColorRef.current = null;
										}
									}}
									containerRef={containerRef}
								/>
							</PropertyItemValue>
						</PropertyItem>
						<PropertyItem direction="column">
							<PropertyItemLabel>Opacity</PropertyItemLabel>
							<PropertyItemValue>
								<div className="flex items-center gap-2">
									<Slider
										value={[element.opacity * 100]}
										min={0}
										max={100}
										step={1}
										onValueChange={([value]) => {
											if (initialOpacityRef.current === null) {
												initialOpacityRef.current = element.opacity;
											}
											editor.timeline.updateElements({
												updates: [
													{
														trackId,
														elementId: element.id,
														updates: { opacity: value / 100 },
													},
												],
												pushHistory: false,
											});
										}}
										onValueCommit={([value]) => {
											if (initialOpacityRef.current !== null) {
												editor.timeline.updateElements({
													updates: [
														{
															trackId,
															elementId: element.id,
															updates: { opacity: initialOpacityRef.current },
														},
													],
													pushHistory: false,
												});
												editor.timeline.updateElements({
													updates: [
														{
															trackId,
															elementId: element.id,
															updates: { opacity: value / 100 },
														},
													],
													pushHistory: true,
												});
												initialOpacityRef.current = null;
											}
										}}
										className="w-full"
									/>
									<Input
										type="number"
										value={opacityDisplay}
										min={0}
										max={100}
										onFocus={() => {
											isEditingOpacity.current = true;
											opacityDraft.current = Math.round(
												element.opacity * 100,
											).toString();
											forceRender();
										}}
										onChange={(e) =>
											handleOpacityChange({ value: e.target.value })
										}
										onBlur={handleOpacityBlur}
										className="bg-accent h-7 w-12 [appearance:textfield] rounded-sm text-center !text-xs [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
									/>
								</div>
							</PropertyItemValue>
						</PropertyItem>
						<PropertyItem direction="column">
							<PropertyItemLabel>Background</PropertyItemLabel>
							<PropertyItemValue>
								<ColorPicker
									value={
										element.backgroundColor === "transparent"
											? lastSelectedColor.current.replace("#", "")
											: element.backgroundColor.replace("#", "")
									}
									onChange={(color) =>
										handleColorChange({ color: `#${color}` })
									}
									onChangeEnd={(color) => handleColorChangeEnd({ color })}
									containerRef={containerRef}
									className={
										element.backgroundColor === "transparent"
											? "pointer-events-none opacity-50"
											: ""
									}
								/>
							</PropertyItemValue>
						</PropertyItem>
					</div>
				</PropertyGroup>
				<PropertyGroup title="Transform">
					<div className="space-y-6">
						<PropertyItem>
							<PropertyItemLabel>Position X</PropertyItemLabel>
							<PropertyItemValue>
								<Input
									type="number"
									value={posXDisplay}
									onFocus={() => {
										isEditingPosX.current = true;
										posXDraft.current = Math.round(
											element.transform.position.x,
										).toString();
										forceRender();
									}}
									onChange={(e) => {
										posXDraft.current = e.target.value;
										forceRender();
										if (initialPosXRef.current === null) {
											initialPosXRef.current = element.transform.position.x;
										}
										const parsed = Number.parseFloat(e.target.value);
										if (!Number.isNaN(parsed)) {
											updateTransform({
												updates: {
													position: {
														...element.transform.position,
														x: parsed,
													},
												},
												pushHistory: false,
											});
										}
									}}
									onBlur={() => {
										if (initialPosXRef.current !== null) {
											const parsed = Number.parseFloat(posXDraft.current);
											const value = Number.isNaN(parsed)
												? element.transform.position.x
												: parsed;
											updateTransform({
												updates: {
													position: {
														...element.transform.position,
														x: initialPosXRef.current,
													},
												},
												pushHistory: false,
											});
											updateTransform({
												updates: {
													position: {
														...element.transform.position,
														x: value,
													},
												},
												pushHistory: true,
											});
											initialPosXRef.current = null;
										}
										isEditingPosX.current = false;
										posXDraft.current = "";
										forceRender();
									}}
									className="bg-accent h-7 w-full [appearance:textfield] rounded-sm px-2 text-center !text-xs [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
								/>
							</PropertyItemValue>
						</PropertyItem>
						<PropertyItem>
							<PropertyItemLabel>Position Y</PropertyItemLabel>
							<PropertyItemValue>
								<Input
									type="number"
									value={posYDisplay}
									onFocus={() => {
										isEditingPosY.current = true;
										posYDraft.current = Math.round(
											element.transform.position.y,
										).toString();
										forceRender();
									}}
									onChange={(e) => {
										posYDraft.current = e.target.value;
										forceRender();
										if (initialPosYRef.current === null) {
											initialPosYRef.current = element.transform.position.y;
										}
										const parsed = Number.parseFloat(e.target.value);
										if (!Number.isNaN(parsed)) {
											updateTransform({
												updates: {
													position: {
														...element.transform.position,
														y: parsed,
													},
												},
												pushHistory: false,
											});
										}
									}}
									onBlur={() => {
										if (initialPosYRef.current !== null) {
											const parsed = Number.parseFloat(posYDraft.current);
											const value = Number.isNaN(parsed)
												? element.transform.position.y
												: parsed;
											updateTransform({
												updates: {
													position: {
														...element.transform.position,
														y: initialPosYRef.current,
													},
												},
												pushHistory: false,
											});
											updateTransform({
												updates: {
													position: {
														...element.transform.position,
														y: value,
													},
												},
												pushHistory: true,
											});
											initialPosYRef.current = null;
										}
										isEditingPosY.current = false;
										posYDraft.current = "";
										forceRender();
									}}
									className="bg-accent h-7 w-full [appearance:textfield] rounded-sm px-2 text-center !text-xs [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
								/>
							</PropertyItemValue>
						</PropertyItem>
						<PropertyItem direction="column">
							<PropertyItemLabel>Scale</PropertyItemLabel>
							<PropertyItemValue>
								<div className="flex items-center gap-2">
									<Slider
										value={[scalePercent]}
										min={10}
										max={500}
										step={1}
										onValueChange={([value]) => {
											if (initialScaleRef.current === null) {
												initialScaleRef.current = element.transform.scale;
											}
											updateTransform({
												updates: { scale: value / 100 },
												pushHistory: false,
											});
										}}
										onValueCommit={([value]) => {
											if (initialScaleRef.current !== null) {
												updateTransform({
													updates: { scale: initialScaleRef.current },
													pushHistory: false,
												});
												updateTransform({
													updates: { scale: value / 100 },
													pushHistory: true,
												});
												initialScaleRef.current = null;
											}
										}}
										className="w-full"
									/>
									<Input
										type="number"
										value={scaleDisplay}
										min={10}
										max={500}
										onFocus={() => {
											isEditingScale.current = true;
											scaleDraft.current = scalePercent.toString();
											forceRender();
										}}
										onChange={(e) => {
											scaleDraft.current = e.target.value;
											forceRender();
											if (initialScaleRef.current === null) {
												initialScaleRef.current = element.transform.scale;
											}
											const parsed = parseInt(e.target.value, 10);
											if (!Number.isNaN(parsed)) {
												const clamped = clamp({
													value: parsed,
													min: 10,
													max: 500,
												});
												updateTransform({
													updates: { scale: clamped / 100 },
													pushHistory: false,
												});
											}
										}}
										onBlur={() => {
											if (initialScaleRef.current !== null) {
												const parsed = parseInt(scaleDraft.current, 10);
												const clamped = Number.isNaN(parsed)
													? scalePercent
													: clamp({ value: parsed, min: 10, max: 500 });
												updateTransform({
													updates: { scale: initialScaleRef.current },
													pushHistory: false,
												});
												updateTransform({
													updates: { scale: clamped / 100 },
													pushHistory: true,
												});
												initialScaleRef.current = null;
											}
											isEditingScale.current = false;
											scaleDraft.current = "";
											forceRender();
										}}
										className="bg-accent h-7 w-14 [appearance:textfield] rounded-sm px-2 text-center !text-xs [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
									/>
								</div>
							</PropertyItemValue>
						</PropertyItem>
						<PropertyItem direction="column">
							<PropertyItemLabel>Rotation</PropertyItemLabel>
							<PropertyItemValue>
								<div className="flex items-center gap-2">
									<Slider
										value={[element.transform.rotate]}
										min={-180}
										max={180}
										step={1}
										onValueChange={([value]) => {
											if (initialRotationRef.current === null) {
												initialRotationRef.current = element.transform.rotate;
											}
											updateTransform({
												updates: { rotate: value },
												pushHistory: false,
											});
										}}
										onValueCommit={([value]) => {
											if (initialRotationRef.current !== null) {
												updateTransform({
													updates: {
														rotate: initialRotationRef.current,
													},
													pushHistory: false,
												});
												updateTransform({
													updates: { rotate: value },
													pushHistory: true,
												});
												initialRotationRef.current = null;
											}
										}}
										className="w-full"
									/>
									<Input
										type="number"
										value={rotationDisplay}
										min={-360}
										max={360}
										onFocus={() => {
											isEditingRotation.current = true;
											rotationDraft.current = Math.round(
												element.transform.rotate,
											).toString();
											forceRender();
										}}
										onChange={(e) => {
											rotationDraft.current = e.target.value;
											forceRender();
											if (initialRotationRef.current === null) {
												initialRotationRef.current =
													element.transform.rotate;
											}
											const parsed = Number.parseFloat(e.target.value);
											if (!Number.isNaN(parsed)) {
												updateTransform({
													updates: { rotate: parsed },
													pushHistory: false,
												});
											}
										}}
										onBlur={() => {
											if (initialRotationRef.current !== null) {
												const parsed = Number.parseFloat(
													rotationDraft.current,
												);
												const value = Number.isNaN(parsed)
													? element.transform.rotate
													: parsed;
												updateTransform({
													updates: {
														rotate: initialRotationRef.current,
													},
													pushHistory: false,
												});
												updateTransform({
													updates: { rotate: value },
													pushHistory: true,
												});
												initialRotationRef.current = null;
											}
											isEditingRotation.current = false;
											rotationDraft.current = "";
											forceRender();
										}}
										className="bg-accent h-7 w-14 [appearance:textfield] rounded-sm px-2 text-center !text-xs [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
									/>
								</div>
							</PropertyItemValue>
						</PropertyItem>
					</div>
				</PropertyGroup>
			</PanelBaseView>
		</div>
	);
}
