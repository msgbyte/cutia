"use client";

import { PanelBaseView as BaseView } from "@/components/editor/panels/panel-base-view";

export function AIView() {
	return (
		<BaseView
			defaultTab="ai-character"
			tabs={[
				{
					value: "ai-character",
					label: "AI Character",
					content: (
						<div className="text-muted-foreground text-sm">
							AI character generation coming soon...
						</div>
					),
				},
				{
					value: "ai-video",
					label: "AI Video",
					content: (
						<div className="text-muted-foreground text-sm">
							AI video generation coming soon...
						</div>
					),
				},
			]}
			className="flex h-full flex-col p-0"
		/>
	);
}
