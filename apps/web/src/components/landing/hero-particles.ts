export type FloatingParticle = {
	id: number;
	size: number;
	x: number;
	y: number;
	duration: number;
	delay: number;
};

const FLOATING_PARTICLES: FloatingParticle[] = [
	{ id: 0, size: 3.1, x: 14, y: 18, duration: 24, delay: -3 },
	{ id: 1, size: 4.2, x: 27, y: 62, duration: 31, delay: -11 },
	{ id: 2, size: 2.8, x: 43, y: 26, duration: 20, delay: -7 },
	{ id: 3, size: 4.6, x: 61, y: 74, duration: 28, delay: -15 },
	{ id: 4, size: 3.4, x: 78, y: 33, duration: 22, delay: -5 },
	{ id: 5, size: 2.5, x: 89, y: 57, duration: 26, delay: -18 },
];

export function getFloatingParticles() {
	return FLOATING_PARTICLES;
}
