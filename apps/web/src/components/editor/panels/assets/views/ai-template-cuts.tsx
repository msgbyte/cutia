"use client";

import { useTranslation } from "@i18next-toolkit/nextjs-approuter";
import { useState } from "react";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { useEditor } from "@/hooks/use-editor";
import { invokeAction } from "@/lib/actions";
import { TEMPLATE_CUTS, type TemplateCutId } from "@/lib/auto-edit/templates";
import { useAssetsPanelStore } from "@/stores/assets-panel-store";
import {
	AudioWave02Icon,
	Folder03Icon,
	SparklesIcon,
	Video01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react";

export function AITemplateCutsView() {
	const { t } = useTranslation();
	const editor = useEditor();
	const setActiveTab = useAssetsPanelStore((state) => state.setActiveTab);
	const [pendingTemplateId, setPendingTemplateId] =
		useState<TemplateCutId | null>(null);

	const mediaAssets = editor.media.getAssets().filter((asset) => !asset.ephemeral);
	const visualAssets = mediaAssets.filter(
		(asset) => asset.type === "image" || asset.type === "video",
	);
	const audioAssets = mediaAssets.filter((asset) => asset.type === "audio");

	const hasTimelineContent = editor.timeline
		.getTracks()
		.some((track) => track.elements.length > 0);

	const handleGenerate = ({ templateId }: { templateId: TemplateCutId }) => {
		if (hasTimelineContent) {
			setPendingTemplateId(templateId);
			return;
		}

		invokeAction("generate-template-cut", { templateId }, "mouseclick");
	};

	const handleConfirmReplace = () => {
		if (!pendingTemplateId) {
			return;
		}

		invokeAction(
			"generate-template-cut",
			{ templateId: pendingTemplateId },
			"mouseclick",
		);
		setPendingTemplateId(null);
	};

	if (visualAssets.length === 0) {
		return (
			<div className="flex min-h-[24rem] flex-col items-center justify-center gap-4 text-center">
				<div className="bg-muted/40 flex size-14 items-center justify-center rounded-full border">
					<HugeiconsIcon icon={Folder03Icon} className="text-muted-foreground size-6" />
				</div>
				<div className="space-y-1">
					<p className="text-sm font-medium">{t("Import visual assets first")}</p>
					<p className="text-muted-foreground text-xs">
						{t(
							"One-click templates use the images and videos already in this project.",
						)}
					</p>
				</div>
				<Button variant="outline" onClick={() => setActiveTab("media")}>
					{t("Go to Media")}
				</Button>
			</div>
		);
	}

	return (
		<>
			<div className="space-y-4">
				<div className="grid grid-cols-2 gap-3">
					<TemplateMetric
						icon={Video01Icon}
						label={t("Visual assets")}
						value={visualAssets.length}
					/>
					<TemplateMetric
						icon={AudioWave02Icon}
						label={t("Audio assets")}
						value={audioAssets.length}
					/>
				</div>

				<div className="space-y-3">
					{TEMPLATE_CUTS.map((template) => (
						<div
							key={template.id}
							className="bg-card space-y-3 rounded-xl border p-4"
						>
							<div className="flex items-start justify-between gap-3">
								<div className="space-y-1">
									<div className="flex items-center gap-2">
										<HugeiconsIcon
											icon={SparklesIcon}
											className="text-muted-foreground size-4"
										/>
										<h3 className="text-sm font-semibold">{template.name}</h3>
									</div>
									<p className="text-muted-foreground text-xs">
										{template.description}
									</p>
								</div>
								<div className="text-muted-foreground rounded-full border px-2 py-1 text-[11px]">
									{template.transitionType}
								</div>
							</div>

							<div className="grid grid-cols-2 gap-2 text-xs">
								<TemplateBadge
									label={t("Image")}
									value={`${template.imageDuration}s`}
								/>
								<TemplateBadge
									label={t("Video")}
									value={`≤ ${template.maxVideoDuration}s`}
								/>
							</div>

							<Button
								className="w-full"
								onClick={() => handleGenerate({ templateId: template.id })}
							>
								{t("Generate")} {template.name}
							</Button>
						</div>
					))}
				</div>
			</div>

			<AlertDialog
				open={pendingTemplateId !== null}
				onOpenChange={(open) => {
					if (!open) {
						setPendingTemplateId(null);
					}
				}}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>{t("Replace current timeline?")}</AlertDialogTitle>
						<AlertDialogDescription>
							{t(
								"Generating a template draft will replace the current scene tracks. You can undo it afterwards.",
							)}
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>{t("Cancel")}</AlertDialogCancel>
						<AlertDialogAction onClick={handleConfirmReplace}>
							{t("Generate")}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</>
	);
}

function TemplateMetric({
	icon,
	label,
	value,
}: {
	icon: IconSvgElement;
	label: string;
	value: number;
}) {
	return (
		<div className="bg-muted/30 rounded-xl border p-3">
			<div className="flex items-center gap-2">
				<HugeiconsIcon icon={icon} className="text-muted-foreground size-4" />
				<span className="text-muted-foreground text-xs">{label}</span>
			</div>
			<div className="mt-2 text-xl font-semibold">{value}</div>
		</div>
	);
}

function TemplateBadge({
	label,
	value,
}: {
	label: string;
	value: string;
}) {
	return (
		<div className="bg-muted/40 flex items-center justify-between rounded-lg border px-3 py-2">
			<span className="text-muted-foreground">{label}</span>
			<span className="font-medium">{value}</span>
		</div>
	);
}
