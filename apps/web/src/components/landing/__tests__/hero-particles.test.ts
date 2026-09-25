import { describe, expect, test } from "bun:test";
import { getFloatingParticles } from "../hero-particles";

describe("getFloatingParticles", () => {
	test("returns stable particle coordinates across calls", () => {
		expect(getFloatingParticles()).toEqual(getFloatingParticles());
		expect(getFloatingParticles()).toHaveLength(6);
	});
});
