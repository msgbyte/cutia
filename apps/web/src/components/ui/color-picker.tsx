import { forwardRef, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/utils/ui";
import { Input } from "./input";

interface ColorPickerProps {
	value?: string;
	onChange?: (value: string) => void;
	onChangeEnd?: (value: string) => void;
	className?: string;
	containerRef?: React.RefObject<HTMLDivElement | null>;
}

const hexToHsv = (hex: string) => {
	const r = parseInt(hex.slice(0, 2), 16) / 255;
	const g = parseInt(hex.slice(2, 4), 16) / 255;
	const b = parseInt(hex.slice(4, 6), 16) / 255;

	const max = Math.max(r, g, b);
	const min = Math.min(r, g, b);
	const diff = max - min;

	let h = 0;
	const s = max === 0 ? 0 : diff / max;
	const v = max;

	if (diff !== 0) {
		switch (max) {
			case r:
				h = ((g - b) / diff) % 6;
				break;
			case g:
				h = (b - r) / diff + 2;
				break;
			case b:
				h = (r - g) / diff + 4;
				break;
		}
	}

	h = (h * 60 + 360) % 360;
	if (Number.isNaN(h)) h = 0;

	return [h, s, v];
};

const hsvToHex = (h: number, s: number, v: number) => {
	const c = v * s;
	const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
	const m = v - c;

	let r = 0,
		g = 0,
		b = 0;

	if (h >= 0 && h < 60) {
		r = c;
		g = x;
		b = 0;
	} else if (h >= 60 && h < 120) {
		r = x;
		g = c;
		b = 0;
	} else if (h >= 120 && h < 180) {
		r = 0;
		g = c;
		b = x;
	} else if (h >= 180 && h < 240) {
		r = 0;
		g = x;
		b = c;
	} else if (h >= 240 && h < 300) {
		r = x;
		g = 0;
		b = c;
	} else if (h >= 300 && h < 360) {
		r = c;
		g = 0;
		b = x;
	}

	r = Math.round((r + m) * 255);
	g = Math.round((g + m) * 255);
	b = Math.round((b + m) * 255);

	return [r, g, b].map((x) => x.toString(16).padStart(2, "0")).join("");
};

const ColorPicker = forwardRef<HTMLDivElement, ColorPickerProps>(
	({ className, value = "FFFFFF", onChange, onChangeEnd, containerRef, ...props }, ref) => {
		const [isOpen, setIsOpen] = useState(false);
		const [isDragging, setIsDragging] = useState<"saturation" | "hue" | null>(
			null,
		);
		const [pickerPosition, setPickerPosition] = useState({
			right: 0,
			bottom: 0,
		});
		const [internalHue, setInternalHue] = useState(0);
		const [inputValue, setInputValue] = useState(value);

		const pickerRef = useRef<HTMLDivElement>(null);
		const saturationRef = useRef<HTMLButtonElement>(null);
		const hueRef = useRef<HTMLButtonElement>(null);
		const triggerRef = useRef<HTMLButtonElement>(null);
		const latestDragColorRef = useRef<string | null>(null);

		const [h, s, v] = hexToHsv(value);
		const displayHue = s > 0 ? h : internalHue;

		useEffect(() => {
			setInputValue(value);
		}, [value]);

		useEffect(() => {
			const handleClickOutside = (event: MouseEvent) => {
				if (
					pickerRef.current &&
					!pickerRef.current.contains(event.target as Node)
				) {
					setIsOpen(false);
				}
			};

			if (isOpen) {
				document.addEventListener("mousedown", handleClickOutside);
				return () =>
					document.removeEventListener("mousedown", handleClickOutside);
			}
		}, [isOpen]);

		useEffect(() => {
			const handleMouseMove = (e: MouseEvent) => {
				if (!isDragging) return;

				if (isDragging === "saturation" && saturationRef.current) {
					const rect = saturationRef.current.getBoundingClientRect();
					const x = Math.max(
						0,
						Math.min(1, (e.clientX - rect.left) / rect.width),
					);
					const y = Math.max(
						0,
						Math.min(1, (e.clientY - rect.top) / rect.height),
					);
					const newS = x;
					const newV = 1 - y;
					const newHex = hsvToHex(displayHue, newS, newV);
					latestDragColorRef.current = newHex;
					onChange?.(newHex);
				}

				if (isDragging === "hue" && hueRef.current) {
					const rect = hueRef.current.getBoundingClientRect();
					const x = Math.max(
						0,
						Math.min(1, (e.clientX - rect.left) / rect.width),
					);
					const newH = x * 360;
					setInternalHue(newH);
					if (s > 0) {
						const newHex = hsvToHex(newH, s, v);
						latestDragColorRef.current = newHex;
						onChange?.(newHex);
					}
				}
			};

			const handleMouseUp = () => {
				if (latestDragColorRef.current !== null && onChangeEnd) {
					onChangeEnd(latestDragColorRef.current);
					latestDragColorRef.current = null;
				}
				setIsDragging(null);
			};

			if (isDragging) {
				document.addEventListener("mousemove", handleMouseMove);
				document.addEventListener("mouseup", handleMouseUp);
				return () => {
					document.removeEventListener("mousemove", handleMouseMove);
					document.removeEventListener("mouseup", handleMouseUp);
				};
			}
		}, [isDragging, displayHue, s, v, onChange]);

		const handleSaturationMouseDown = (e: React.MouseEvent) => {
			e.preventDefault();
			const saturationElement = saturationRef.current;
			if (!saturationElement) return;
			setIsDragging("saturation");
			const rect = saturationElement.getBoundingClientRect();
			const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
			const y = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
			const newS = x;
			const newV = 1 - y;
			const newHex = hsvToHex(displayHue, newS, newV);
			latestDragColorRef.current = newHex;
			onChange?.(newHex);
		};

		const handleHueMouseDown = (e: React.MouseEvent) => {
			e.preventDefault();
			const hueElement = hueRef.current;
			if (!hueElement) return;
			setIsDragging("hue");
			const rect = hueElement.getBoundingClientRect();
			const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
			const newH = x * 360;
			setInternalHue(newH);
			if (s > 0) {
				const newHex = hsvToHex(newH, s, v);
				latestDragColorRef.current = newHex;
				onChange?.(newHex);
			}
		};

		const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
			const hex = e.target.value.replace("#", "");
			setInputValue(hex);
		};

		const handleInputBlur = () => {
			onChange?.(inputValue);
		};

		const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
			if (e.key === "Enter") {
				onChange?.(inputValue);
				e.currentTarget.blur();
			}
		};

		const saturationStyle = {
			background: `linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, hsl(${displayHue}, 100%, 50%))`,
		};

		const hueStyle = {
			background:
				"linear-gradient(to right, #f00 0%, #ff0 17%, #0f0 33%, #0ff 50%, #00f 67%, #f0f 83%, #f00 100%)",
		};

		return (
			<div className="relative flex-1">
				<div
					ref={ref}
					className={cn(
						"bg-accent flex h-8 items-center gap-2 rounded-md px-[0.45rem]",
						className,
					)}
					{...props}
				>
					<button
						ref={triggerRef}
						className="size-4.5 cursor-pointer border rounded-sm hover:ring-2 hover:ring-white/20"
						style={{ backgroundColor: `#${value}` }}
						type="button"
						onClick={() => {
							if (!isOpen && triggerRef.current && containerRef?.current) {
								const containerRect =
									containerRef.current.getBoundingClientRect();
								setPickerPosition({
									right: window.innerWidth - containerRect.left - 8,
									bottom: window.innerHeight - containerRect.bottom,
								});
							}
							setIsOpen(!isOpen);
						}}
					/>
					<div className="flex flex-1 items-center">
						<Input
							className="!border-0 bg-transparent p-0 !ring-0 !ring-offset-0 uppercase"
							size="sm"
							containerClassName="w-full"
							value={inputValue}
							onChange={handleInputChange}
							onBlur={handleInputBlur}
							onKeyDown={handleInputKeyDown}
						/>
					</div>
				</div>

				{isOpen &&
					createPortal(
						<div
							ref={pickerRef}
							className="bg-popover border-border fixed z-50 rounded-lg border p-4 shadow-lg select-none"
							style={{
								right: pickerPosition.right,
								bottom: pickerPosition.bottom,
							}}
						>
							<button
								ref={saturationRef}
								className="relative mb-3 h-32 w-48 cursor-crosshair appearance-none border-0 bg-transparent p-0"
								style={saturationStyle}
								type="button"
								onMouseDown={handleSaturationMouseDown}
							>
								<ColorCircle
									size="sm"
									position={{ left: `${s * 100}%`, top: `${(1 - v) * 100}%` }}
									color={`#${value}`}
								/>
							</button>

							<button
								ref={hueRef}
								className="relative h-4 w-48 cursor-pointer rounded-lg appearance-none border-0 bg-transparent p-0"
								style={hueStyle}
								type="button"
								onMouseDown={handleHueMouseDown}
							>
								<ColorCircle
									size="md"
									position={{
										left: `${(displayHue / 360) * 100}%`,
										top: "50%",
									}}
									color={`#${value}`}
								/>
							</button>
						</div>,
						document.body,
					)}
			</div>
		);
	},
);
ColorPicker.displayName = "ColorPicker";

const ColorCircle = ({
	size,
	position,
	color,
}: {
	size: "sm" | "md";
	position: { left: string; top: string };
	color: string;
}) => (
	<div
		className={`pointer-events-none absolute rounded-full border-3 border-white shadow-lg ${
			size === "sm" ? "size-3" : "size-4"
		}`}
		style={{
			left: position.left,
			top: position.top,
			transform: "translate(-50%, -50%)",
			backgroundColor: color,
		}}
	/>
);

export { ColorPicker };
