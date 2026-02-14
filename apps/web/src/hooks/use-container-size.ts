import { useEffect, useState } from "react";

export function useContainerSize({
	containerRef,
}: {
	containerRef: React.RefObject<HTMLElement | null>;
}) {
	const [size, setSize] = useState({ width: 0, height: 0 });

	useEffect(() => {
		const container = containerRef.current;
		if (!container) return;

		const observer = new ResizeObserver((entries) => {
			for (const entry of entries) {
				const { width, height } = entry.contentRect;
				setSize({ width, height });
			}
		});

		observer.observe(container);

		return () => {
			observer.disconnect();
		};
	}, [containerRef]);

	return size;
}
