import type {
	MarbleAuthorList,
	MarbleCategoryList,
	MarblePost,
	MarblePostList,
	MarbleTagList,
} from "@/types/blog";
import { unified } from "unified";
import rehypeParse from "rehype-parse";
import rehypeStringify from "rehype-stringify";
import rehypeSlug from "rehype-slug";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import rehypeSanitize from "rehype-sanitize";

const url =
	process.env.NEXT_PUBLIC_MARBLE_API_URL ?? "https://api.marblecms.com";
const key = process.env.MARBLE_WORKSPACE_KEY ?? "cmd4iw9mm0006l804kwqv0k46";

async function fetchFromMarble<T>({
	endpoint,
}: {
	endpoint: string;
}): Promise<T> {
	try {
		const response = await fetch(`${url}/${key}/${endpoint}`);
		if (!response.ok) {
			throw new Error(
				`Failed to fetch ${endpoint}: ${response.status} ${response.statusText}`,
			);
		}
		return (await response.json()) as T;
	} catch (error) {
		console.error(`Error fetching ${endpoint}:`, error);
		throw error;
	}
}

export async function getPosts() {
	return fetchFromMarble<MarblePostList>({ endpoint: "posts" });
}

export async function getTags() {
	return fetchFromMarble<MarbleTagList>({ endpoint: "tags" });
}

export async function getSinglePost({ slug }: { slug: string }) {
	return fetchFromMarble<MarblePost>({ endpoint: `posts/${slug}` });
}

export async function getCategories() {
	return fetchFromMarble<MarbleCategoryList>({ endpoint: "categories" });
}

export async function getAuthors() {
	return fetchFromMarble<MarbleAuthorList>({ endpoint: "authors" });
}

export async function processHtmlContent({
	html,
}: {
	html: string;
}): Promise<string> {
	const processor = unified()
		.use(rehypeSanitize)
		.use(rehypeParse, { fragment: true })
		.use(rehypeSlug)
		.use(rehypeAutolinkHeadings, { behavior: "append" })
		.use(rehypeStringify);

	const file = await processor.process({ value: html, type: "html" });
	return String(file);
}
