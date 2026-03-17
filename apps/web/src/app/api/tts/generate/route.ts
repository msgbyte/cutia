import { webEnv } from "@cutia/env/web";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { synthesizeSpeechWithFallback } from "@/lib/tts/provider";

const requestSchema = z.object({
	text: z.string().min(1, "Text is required").max(2000, "Text too long"),
	voice: z.string().optional(),
});

export async function POST(request: NextRequest) {
	try {
		const body = await request.json();
		const validation = requestSchema.safeParse(body);

		if (!validation.success) {
			return NextResponse.json(
				{
					error: "Invalid request",
					details: validation.error.flatten().fieldErrors,
				},
				{ status: 400 },
			);
		}

		const { text, voice } = validation.data;
		const audioArrayBuffer = await synthesizeSpeechWithFallback({
			env: webEnv,
			text,
			voice,
		});
		const base64 = Buffer.from(audioArrayBuffer).toString("base64");

		return NextResponse.json({ audio: base64 });
	} catch (error) {
		const message = error instanceof Error ? error.message : "Unknown error";
		console.error("TTS generate error:", error);

		if (message === "External TTS is not configured") {
			return NextResponse.json({ error: message }, { status: 500 });
		}

		if (
			message.startsWith("External TTS request failed:") ||
			message === "External TTS returned empty audio" ||
			message.startsWith("Legacy TTS ")
		) {
			return NextResponse.json({ error: message }, { status: 502 });
		}

		return NextResponse.json(
			{ error: "Internal server error", detail: message },
			{ status: 500 },
		);
	}
}
