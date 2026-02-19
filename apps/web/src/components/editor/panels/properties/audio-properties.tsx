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
import type { AudioElement } from "@/types/timeline";
import { SPEED_PRESETS, formatSpeedLabel } from "@/lib/timeline/speed-utils";

export function AudioProperties({
	_element: element,
	trackId,
}: {
	_element: AudioElement;
	trackId: string;
}) {
	const editor = useEditor();
	const [, forceRender] = useReducer((x: number) => x + 1, 0);

	const isEditingVolume = useRef(false);
	const isEditingSpeed = useRef(false);

	const volumeDraft = useRef("");
	const speedDraft = useRef("");

	const initialVolumeRef = useRef<number | null>(null);
	const initialSpeedRef = useRef<number | null>(null);

	const volumePercent = Math.round(element.volume * 100);
	const volumeDisplay = isEditingVolume.current
		? volumeDraft.current
		: volumePercent.toString();

	const currentSpeed = element.playbackRate ?? 1;
	const speedDisplay = isEditingSpeed.current
		? speedDraft.current
		: formatSpeedLabel({ rate: currentSpeed });

	const updateElement = ({
		updates,
		pushHistory = true,
	}: {
		updates: Partial<Record<string, unknown>>;
		pushHistory?: boolean;
	}) => {
		editor.timeline.updateElements({
			updates: [{ trackId, elementId: element.id, updates }],
			pushHistory,
		});
	};

	const applySpeedChange = ({
		newRate,
		pushHistory,
	}: {
		newRate: number;
		pushHistory: boolean;
	}) => {
		const oldRate = currentSpeed;
		const newDuration = element.duration * (oldRate / newRate);

		updateElement({
			updates: { playbackRate: newRate, duration: newDuration },
			pushHistory,
		});
	};

	return (
		<div className="flex h-full flex-col">
			<PanelBaseView className="p-0">
				<PropertyGroup title="Volume" hasBorderTop={false} collapsible={false}>
					<div className="space-y-6">
						<PropertyItem direction="column">
							<PropertyItemLabel>Volume</PropertyItemLabel>
							<PropertyItemValue>
								<div className="flex items-center gap-2">
									<Slider
										value={[volumePercent]}
										min={0}
										max={200}
										step={1}
										onValueChange={([value]) => {
											if (initialVolumeRef.current === null) {
												initialVolumeRef.current = element.volume;
											}
											updateElement({
												updates: { volume: value / 100 },
												pushHistory: false,
											});
										}}
										onValueCommit={([value]) => {
											if (initialVolumeRef.current !== null) {
												updateElement({
													updates: { volume: initialVolumeRef.current },
													pushHistory: false,
												});
												updateElement({
													updates: { volume: value / 100 },
													pushHistory: true,
												});
												initialVolumeRef.current = null;
											}
										}}
										className="w-full"
									/>
									<Input
										type="number"
										value={volumeDisplay}
										min={0}
										max={200}
										onFocus={() => {
											isEditingVolume.current = true;
											volumeDraft.current = volumePercent.toString();
											forceRender();
										}}
										onChange={(event) => {
											volumeDraft.current = event.target.value;
											forceRender();
											if (initialVolumeRef.current === null) {
												initialVolumeRef.current = element.volume;
											}
											const parsed = Number.parseInt(event.target.value, 10);
											if (!Number.isNaN(parsed)) {
												const clamped = clamp({ value: parsed, min: 0, max: 200 });
												updateElement({
													updates: { volume: clamped / 100 },
													pushHistory: false,
												});
											}
										}}
										onBlur={() => {
											if (initialVolumeRef.current !== null) {
												const parsed = Number.parseInt(volumeDraft.current, 10);
												const clamped = Number.isNaN(parsed)
													? volumePercent
													: clamp({ value: parsed, min: 0, max: 200 });
												updateElement({
													updates: { volume: initialVolumeRef.current },
													pushHistory: false,
												});
												updateElement({
													updates: { volume: clamped / 100 },
													pushHistory: true,
												});
												initialVolumeRef.current = null;
											}
											isEditingVolume.current = false;
											volumeDraft.current = "";
											forceRender();
										}}
										className="bg-accent h-7 w-14 [appearance:textfield] rounded-sm px-2 text-center !text-xs [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
									/>
								</div>
							</PropertyItemValue>
						</PropertyItem>
					</div>
				</PropertyGroup>

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
			</PanelBaseView>
		</div>
	);
}
