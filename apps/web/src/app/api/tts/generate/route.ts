import { webEnv } from "@cutia/env/web";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { isTtsError } from "@/lib/tts/errors";
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

		if (isTtsError(error)) {
			switch (error.code) {
				case "EXTERNAL_TTS_CONFIG":
					return NextResponse.json({ error: message }, { status: 500 });
				case "EXTERNAL_TTS_UPSTREAM":
				case "LEGACY_TTS_UPSTREAM":
					return NextResponse.json({ error: message }, { status: 502 });
				default: {
					const exhaustiveCode: never = error.code;
					throw new Error(`Unhandled TTS error code: ${exhaustiveCode}`);
				}
			}
		}

		return NextResponse.json(
			{ error: "Internal server error", detail: message },
			{ status: 500 },
		);
	}
}
