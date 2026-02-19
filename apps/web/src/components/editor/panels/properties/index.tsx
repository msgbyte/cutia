"use client";

import { ScrollArea } from "@/components/ui/scroll-area";
import { AudioProperties } from "./audio-properties";
import { VideoProperties } from "./video-properties";
import { TextProperties } from "./text-properties";
import { EmptyView } from "./empty-view";
import { useEditor } from "@/hooks/use-editor";
import { useElementSelection } from "@/hooks/timeline/element/use-element-selection";

export function PropertiesPanel() {
	const editor = useEditor();
	const { selectedElements } = useElementSelection();

	const elementsWithTracks = editor.timeline.getElementsWithTracks({
		elements: selectedElements,
	});

	return (
		<div className="panel bg-background h-full rounded-sm border overflow-hidden">
			{selectedElements.length > 0 ? (
				<ScrollArea className="h-full">
					{elementsWithTracks.map(({ track, element }) => {
						if (element.type === "text") {
							return (
								<div key={element.id}>
									<TextProperties element={element} trackId={track.id} />
								</div>
							);
						}
					if (element.type === "audio") {
						return (
							<div key={element.id}>
								<AudioProperties _element={element} trackId={track.id} />
							</div>
						);
					}
					if (element.type === "video" || element.type === "image") {
						return (
							<div key={element.id}>
								<VideoProperties _element={element} trackId={track.id} />
							</div>
						);
						}
						return null;
					})}
				</ScrollArea>
			) : (
				<EmptyView />
			)}
		</div>
	);
}
