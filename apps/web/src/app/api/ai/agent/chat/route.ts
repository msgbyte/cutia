import { type NextRequest, NextResponse } from "next/server";

function getUpstreamUrl(baseUrl: string) {
	return `${baseUrl.replace(/\/+$/, "")}/chat/completions`;
}

export async function POST(request: NextRequest) {
	const baseUrl = request.nextUrl.searchParams.get("baseUrl");

	if (!baseUrl) {
		return NextResponse.json(
			{ error: "Missing baseUrl query parameter" },
			{ status: 400 },
		);
	}

	try {
		const body = await request.text();
		const authorization = request.headers.get("authorization");

		const upstreamResponse = await fetch(getUpstreamUrl(baseUrl), {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				...(authorization ? { Authorization: authorization } : {}),
			},
			body,
		});

		if (!upstreamResponse.body) {
			const errorText = await upstreamResponse.text();
			return new NextResponse(errorText, {
				status: upstreamResponse.status,
				headers: {
					"Content-Type":
						upstreamResponse.headers.get("content-type") ?? "text/plain",
				},
			});
		}

		return new NextResponse(upstreamResponse.body, {
			status: upstreamResponse.status,
			headers: {
				"Content-Type":
					upstreamResponse.headers.get("content-type") ??
					"text/event-stream; charset=utf-8",
				"Cache-Control": "no-cache, no-transform",
				Connection: "keep-alive",
			},
		});
	} catch (error) {
		console.error("Agent chat proxy error:", error);
		return NextResponse.json(
			{ error: "Proxy request failed" },
			{ status: 502 },
		);
	}
}
