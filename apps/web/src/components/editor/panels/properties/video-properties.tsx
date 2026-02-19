import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { useReducer, useRef } from "react";
import { PanelBaseView } from "@/components/editor/panels/panel-base-view";
import {
	PropertyGroup,
	PropertyItem,
	PropertyItemLabel,
	PropertyItemValue,
} from "./property-item";
import { clamp } from "@/utils/math";
import { useEditor } from "@/hooks/use-editor";
import type { ImageElement, VideoElement } from "@/types/timeline";
import { SPEED_PRESETS, formatSpeedLabel } from "@/lib/timeline/speed-utils";

export function VideoProperties({
	_element: element,
	trackId,
}: {
	_element: VideoElement | ImageElement;
	trackId: string;
}) {
	const editor = useEditor();
	const [, forceRender] = useReducer((x: number) => x + 1, 0);

	const isEditingScale = useRef(false);
	const isEditingPosX = useRef(false);
	const isEditingPosY = useRef(false);
	const isEditingRotation = useRef(false);
	const isEditingOpacity = useRef(false);
	const isEditingSpeed = useRef(false);

	const scaleDraft = useRef("");
	const posXDraft = useRef("");
	const posYDraft = useRef("");
	const rotationDraft = useRef("");
	const opacityDraft = useRef("");
	const speedDraft = useRef("");

	const initialScaleRef = useRef<number | null>(null);
	const initialPosXRef = useRef<number | null>(null);
	const initialPosYRef = useRef<number | null>(null);
	const initialRotationRef = useRef<number | null>(null);
	const initialOpacityRef = useRef<number | null>(null);
	const initialSpeedRef = useRef<number | null>(null);

	const scalePercent = Math.round(element.transform.scale * 100);
	const scaleDisplay = isEditingScale.current
		? scaleDraft.current
		: scalePercent.toString();
	const posXDisplay = isEditingPosX.current
		? posXDraft.current
		: Math.round(element.transform.position.x).toString();
	const posYDisplay = isEditingPosY.current
		? posYDraft.current
		: Math.round(element.transform.position.y).toString();
	const rotationDisplay = isEditingRotation.current
		? rotationDraft.current
		: Math.round(element.transform.rotate).toString();
	const opacityDisplay = isEditingOpacity.current
		? opacityDraft.current
		: Math.round(element.opacity * 100).toString();

	const isVideoElement = element.type === "video";
	const currentSpeed = isVideoElement
		? (element as VideoElement).playbackRate ?? 1
		: 1;
	const speedDisplay = isEditingSpeed.current
		? speedDraft.current
		: formatSpeedLabel({ rate: currentSpeed });

	const applySpeedChange = ({
		newRate,
		pushHistory,
	}: {
		newRate: number;
		pushHistory: boolean;
	}) => {
		if (!isVideoElement) return;
		const oldRate = currentSpeed;
		const newDuration = element.duration * (oldRate / newRate);

		editor.timeline.updateElements({
			updates: [
				{
					trackId,
					elementId: element.id,
					updates: {
						playbackRate: newRate,
						duration: newDuration,
					},
				},
			],
			pushHistory,
		});
	};

	const updateTransform = ({
		updates,
		pushHistory = true,
	}: {
		updates: Partial<typeof element.transform>;
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

	const commitNumberField = ({
		draft,
		initial,
		apply,
	}: {
		draft: string;
		initial: React.RefObject<number | null>;
		apply: (value: number) => void;
	}) => {
		if (initial.current === null) return;
		const parsed = Number.parseFloat(draft);
		if (!Number.isNaN(parsed)) {
			apply(parsed);
		}
		initial.current = null;
	};

	return (
		<div className="flex h-full flex-col">
			<PanelBaseView className="p-0">
				<PropertyGroup title="Transform" hasBorderTop={false} collapsible={false}>
					<div className="space-y-6">
						{/* Position X */}
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
												updates: { position: { ...element.transform.position, x: parsed } },
												pushHistory: false,
											});
										}
									}}
									onBlur={() => {
										commitNumberField({
											draft: posXDraft.current,
											initial: initialPosXRef,
											apply: (value) => {
												updateTransform({
													updates: { position: { ...element.transform.position, x: initialPosXRef.current ?? 0 } },
													pushHistory: false,
												});
												updateTransform({
													updates: { position: { ...element.transform.position, x: value } },
													pushHistory: true,
												});
											},
										});
										isEditingPosX.current = false;
										posXDraft.current = "";
										forceRender();
									}}
									className="bg-accent h-7 w-full [appearance:textfield] rounded-sm px-2 text-center !text-xs [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
								/>
							</PropertyItemValue>
						</PropertyItem>

						{/* Position Y */}
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
												updates: { position: { ...element.transform.position, y: parsed } },
												pushHistory: false,
											});
										}
									}}
									onBlur={() => {
										commitNumberField({
											draft: posYDraft.current,
											initial: initialPosYRef,
											apply: (value) => {
												updateTransform({
													updates: { position: { ...element.transform.position, y: initialPosYRef.current ?? 0 } },
													pushHistory: false,
												});
												updateTransform({
													updates: { position: { ...element.transform.position, y: value } },
													pushHistory: true,
												});
											},
										});
										isEditingPosY.current = false;
										posYDraft.current = "";
										forceRender();
									}}
									className="bg-accent h-7 w-full [appearance:textfield] rounded-sm px-2 text-center !text-xs [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
								/>
							</PropertyItemValue>
						</PropertyItem>

						{/* Scale */}
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
												const clamped = clamp({ value: parsed, min: 10, max: 500 });
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

						{/* Rotation */}
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
													updates: { rotate: initialRotationRef.current },
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
												initialRotationRef.current = element.transform.rotate;
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
											commitNumberField({
												draft: rotationDraft.current,
												initial: initialRotationRef,
												apply: (value) => {
													updateTransform({
														updates: { rotate: initialRotationRef.current ?? 0 },
														pushHistory: false,
													});
													updateTransform({
														updates: { rotate: value },
														pushHistory: true,
													});
												},
											});
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

				<PropertyGroup title="Appearance" collapsible={false}>
					<div className="space-y-6">
						{/* Opacity */}
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
										onChange={(e) => {
											opacityDraft.current = e.target.value;
											forceRender();
											if (initialOpacityRef.current === null) {
												initialOpacityRef.current = element.opacity;
											}
											const parsed = parseInt(e.target.value, 10);
											if (!Number.isNaN(parsed)) {
												const opacityPercent = clamp({ value: parsed, min: 0, max: 100 });
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
										}}
										onBlur={() => {
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
										}}
										className="bg-accent h-7 w-14 [appearance:textfield] rounded-sm px-2 text-center !text-xs [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
									/>
								</div>
							</PropertyItemValue>
						</PropertyItem>
					</div>
				</PropertyGroup>

				{isVideoElement && (
					<PropertyGroup title="Speed" collapsible={false}>
						<div className="space-y-6">
							<PropertyItem direction="column">
								<PropertyItemLabel>Playback Speed</PropertyItemLabel>
								<PropertyItemValue>
									<div className="flex flex-wrap gap-1.5">
										{SPEED_PRESETS.map((preset) => {
											const isActive = Math.abs(currentSpeed - preset.value) < 0.001;
											return (
												<button
													key={preset.value}
													type="button"
													className={`rounded-sm px-2 py-0.5 text-xs transition-colors ${
														isActive
															? "bg-primary text-primary-foreground"
															: "bg-accent hover:bg-accent/80"
													}`}
													onClick={() => {
														initialSpeedRef.current = currentSpeed;
														applySpeedChange({
															newRate: preset.value,
															pushHistory: true,
														});
														initialSpeedRef.current = null;
													}}
													onKeyDown={(event) => {
														if (event.key === "Enter" || event.key === " ") {
															initialSpeedRef.current = currentSpeed;
															applySpeedChange({
																newRate: preset.value,
																pushHistory: true,
															});
															initialSpeedRef.current = null;
														}
													}}
												>
													{preset.label}
												</button>
											);
										})}
									</div>
								</PropertyItemValue>
							</PropertyItem>

							<PropertyItem>
								<PropertyItemLabel>Custom</PropertyItemLabel>
								<PropertyItemValue>
									<div className="flex items-center gap-1">
										<Input
											type="number"
											value={speedDisplay}
											min={0.25}
											max={4}
											step={0.05}
											onFocus={() => {
												isEditingSpeed.current = true;
												speedDraft.current = formatSpeedLabel({ rate: currentSpeed });
												forceRender();
											}}
											onChange={(event) => {
												speedDraft.current = event.target.value;
												forceRender();
												if (initialSpeedRef.current === null) {
													initialSpeedRef.current = currentSpeed;
												}
												const parsed = Number.parseFloat(event.target.value);
												if (!Number.isNaN(parsed)) {
													const clamped = clamp({ value: parsed, min: 0.25, max: 4 });
													applySpeedChange({
														newRate: clamped,
														pushHistory: false,
													});
												}
											}}
											onBlur={() => {
												if (initialSpeedRef.current !== null) {
													const parsed = Number.parseFloat(speedDraft.current);
													const clamped = Number.isNaN(parsed)
														? currentSpeed
														: clamp({ value: parsed, min: 0.25, max: 4 });
													applySpeedChange({
														newRate: initialSpeedRef.current,
														pushHistory: false,
													});
													applySpeedChange({
														newRate: clamped,
														pushHistory: true,
													});
													initialSpeedRef.current = null;
												}
												isEditingSpeed.current = false;
												speedDraft.current = "";
												forceRender();
											}}
											className="bg-accent h-7 w-full [appearance:textfield] rounded-sm px-2 text-center !text-xs [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
										/>
										<span className="text-muted-foreground text-xs">x</span>
									</div>
								</PropertyItemValue>
							</PropertyItem>
						</div>
					</PropertyGroup>
				)}
				</PanelBaseView>
		</div>
	);
}
