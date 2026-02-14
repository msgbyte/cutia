"use client";

import { useEffect, useRef, useState } from "react";
import { formatTimeCode, parseTimeCode } from "@/lib/time";
import type { TTimeCode } from "@/types/time";
import { cn } from "@/utils/ui";

interface EditableTimecodeProps {
	time: number;
	duration: number;
	format?: TTimeCode;
	fps: number;
	onTimeChange?: ({ time }: { time: number }) => void;
	className?: string;
	disabled?: boolean;
}

export function EditableTimecode({
	time,
	duration,
	format = "HH:MM:SS:FF",
	fps,
	onTimeChange,
	className,
	disabled = false,
}: EditableTimecodeProps) {
	const [isEditing, setIsEditing] = useState(false);
	const [inputValue, setInputValue] = useState("");
	const [hasError, setHasError] = useState(false);
	const inputRef = useRef<HTMLInputElement>(null);
	const enterPressedRef = useRef(false);
	const formattedTime = formatTimeCode({ timeInSeconds: time, format, fps });

	const startEditing = () => {
		if (disabled) return;
		setIsEditing(true);
		setInputValue(formattedTime);
		setHasError(false);
		enterPressedRef.current = false;
	};

	const cancelEditing = () => {
		setIsEditing(false);
		setInputValue("");
		setHasError(false);
		enterPressedRef.current = false;
	};

	const applyEdit = () => {
		const parsedTime = parseTimeCode({ timeCode: inputValue, format, fps });

		if (parsedTime === null) {
			setHasError(true);
			return;
		}

		const clampedTime = Math.max(
			0,
			duration ? Math.min(duration, parsedTime) : parsedTime,
		);

		onTimeChange?.({ time: clampedTime });
		setIsEditing(false);
		setInputValue("");
		setHasError(false);
		enterPressedRef.current = false;
	};

	const handleKeyDown = ({
		key,
		preventDefault,
	}: React.KeyboardEvent<HTMLInputElement>) => {
		if (key === "Enter") {
			preventDefault();
			enterPressedRef.current = true;
			applyEdit();
		} else if (key === "Escape") {
			preventDefault();
			cancelEditing();
		}
	};

	const handleInputChange = ({
		target,
	}: React.ChangeEvent<HTMLInputElement>) => {
		setInputValue(target.value);
		setHasError(false);
	};

	const handleBlur = () => {
		if (!enterPressedRef.current && isEditing) {
			applyEdit();
		}
	};

	const handleDisplayKeyDown = ({
		key,
		preventDefault,
	}: React.KeyboardEvent<HTMLButtonElement>) => {
		if (disabled) return;

		if (key === "Enter" || key === " ") {
			preventDefault();
			startEditing();
		}
	};

	useEffect(() => {
		if (isEditing && inputRef.current) {
			inputRef.current.focus();
			inputRef.current.select();
		}
	}, [isEditing]);

	if (isEditing) {
		return (
			<input
				ref={inputRef}
				type="text"
				value={inputValue}
				onChange={handleInputChange}
				onKeyDown={handleKeyDown}
				onBlur={handleBlur}
				className={cn(
					"-mx-1 border border-transparent bg-transparent px-1 font-mono text-xs outline-none",
					"focus:bg-background focus:border-primary focus:rounded",
					"text-primary tabular-nums",
					hasError && "text-destructive focus:border-destructive",
					className,
				)}
				style={{ width: `${formattedTime.length + 1}ch` }}
				placeholder={formattedTime}
			/>
		);
	}

	return (
		<button
			type="button"
			onClick={startEditing}
			onKeyDown={handleDisplayKeyDown}
			disabled={disabled}
			className={cn(
				"text-primary cursor-pointer font-mono text-xs tabular-nums",
				"hover:bg-muted/50 -mx-1 px-1 hover:rounded",
				disabled && "cursor-default hover:bg-transparent",
				className,
			)}
			title={disabled ? undefined : "Click to edit time"}
		>
			{formattedTime}
		</button>
	);
}
