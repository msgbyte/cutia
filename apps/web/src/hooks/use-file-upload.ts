import { useState, useRef } from "react";
import { hasDragData } from "@/lib/drag-data";

interface UseFileUploadOptions {
	accept?: string;
	multiple?: boolean;
	onFilesSelected?: (files: FileList) => void;
}

function containsFiles(dataTransfer: DataTransfer): boolean {
	return !hasDragData({ dataTransfer }) && dataTransfer.types.includes("Files");
}

export function useFileUpload({
	accept,
	multiple,
	onFilesSelected,
}: UseFileUploadOptions = {}) {
	const [isDragOver, setIsDragOver] = useState(false);
	const dragCounterRef = useRef(0);
	const inputRef = useRef<HTMLInputElement>(null);

	function openFilePicker() {
		if (!inputRef.current) return;

		inputRef.current.accept = accept || "*";
		inputRef.current.multiple = multiple || false;
		inputRef.current.click();
	}

	function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
		const files = event.target.files;
		if (files && files.length > 0 && onFilesSelected) {
			onFilesSelected(files);
		}

		if (event.target) {
			event.target.value = "";
		}
	}

	function handleDragEnter(e: React.DragEvent) {
		e.preventDefault();

		if (!containsFiles(e.dataTransfer)) return;

		dragCounterRef.current += 1;
		setIsDragOver(true);
	}

	function handleDragOver(e: React.DragEvent) {
		e.preventDefault();

		if (!containsFiles(e.dataTransfer)) return;
	}

	function handleDragLeave(e: React.DragEvent) {
		e.preventDefault();

		if (!containsFiles(e.dataTransfer)) return;

		dragCounterRef.current -= 1;
		if (dragCounterRef.current === 0) {
			setIsDragOver(false);
		}
	}

	function handleDrop(e: React.DragEvent) {
		e.preventDefault();
		setIsDragOver(false);
		dragCounterRef.current = 0;

		if (onFilesSelected && containsFiles(e.dataTransfer)) {
			const files = e.dataTransfer.files;
			const shouldUseMultiple = multiple ?? false;

			if (shouldUseMultiple) {
				onFilesSelected(files);
			} else if (files.length > 0) {
				const dataTransfer = new DataTransfer();
				dataTransfer.items.add(files[0]);
				onFilesSelected(dataTransfer.files);
			}
		}
	}

	return {
		isDragOver,
		openFilePicker,
		fileInputProps: {
			ref: inputRef,
			type: "file",
			style: { display: "none" },
			onChange: handleFileChange,
		},
		dragProps: {
			onDragEnter: handleDragEnter,
			onDragOver: handleDragOver,
			onDragLeave: handleDragLeave,
			onDrop: handleDrop,
		},
	};
}
