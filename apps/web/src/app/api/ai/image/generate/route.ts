import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const proxyRequestSchema = z.object({
	url: z.string().url(),
	headers: z.record(z.string()).optional(),
	body: z.record(z.unknown()),
});

export async function POST(request: NextRequest) {
	try {
		const json = await request.json();

		const validation = proxyRequestSchema.safeParse(json);
		if (!validation.success) {
			return NextResponse.json(
				{
					error: "Invalid request",
					details: validation.error.flatten().fieldErrors,
				},
				{ status: 400 },
			);
		}

		const { url, headers, body } = validation.data;

		const response = await fetch(url, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				...headers,
			},
			body: JSON.stringify(body),
		});

		const responseData = await response.json();

		if (!response.ok) {
			return NextResponse.json(responseData, { status: response.status });
		}

		return NextResponse.json(responseData);
	} catch (error) {
		console.error("AI image proxy error:", error);
		return NextResponse.json(
			{ error: "Proxy request failed" },
			{ status: 500 },
		);
	}
}
