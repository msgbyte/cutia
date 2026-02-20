"use client";

import { useEffect, useRef, useCallback } from "react";
import { useTheme } from "next-themes";

interface Star {
	x: number;
	y: number;
	radius: number;
	baseOpacity: number;
	twinkleSpeed: number;
	twinkleOffset: number;
}

interface ShootingStar {
	x: number;
	y: number;
	length: number;
	speed: number;
	angle: number;
	opacity: number;
	decay: number;
	active: boolean;
}

interface Particle {
	x: number;
	y: number;
	radius: number;
	vx: number;
	vy: number;
	opacity: number;
	baseOpacity: number;
	pulseSpeed: number;
	pulseOffset: number;
}

const STAR_COUNT = 200;
const PARTICLE_COUNT = 30;
const SHOOTING_STAR_INTERVAL_MS = 4000;

function createStars({ width, height }: { width: number; height: number }): Star[] {
	return Array.from({ length: STAR_COUNT }, () => ({
		x: Math.random() * width,
		y: Math.random() * height,
		radius: Math.random() * 1.5 + 0.3,
		baseOpacity: Math.random() * 0.6 + 0.2,
		twinkleSpeed: Math.random() * 2 + 1,
		twinkleOffset: Math.random() * Math.PI * 2,
	}));
}

function createParticles({ width, height }: { width: number; height: number }): Particle[] {
	return Array.from({ length: PARTICLE_COUNT }, () => ({
		x: Math.random() * width,
		y: Math.random() * height,
		radius: Math.random() * 2 + 1,
		vx: (Math.random() - 0.5) * 0.3,
		vy: (Math.random() - 0.5) * 0.2 - 0.1,
		opacity: 0,
		baseOpacity: Math.random() * 0.3 + 0.1,
		pulseSpeed: Math.random() * 1.5 + 0.5,
		pulseOffset: Math.random() * Math.PI * 2,
	}));
}

function spawnShootingStar({ width, height }: { width: number; height: number }): ShootingStar {
	const startFromLeft = Math.random() > 0.5;
	return {
		x: startFromLeft ? Math.random() * width * 0.5 : width * 0.5 + Math.random() * width * 0.5,
		y: Math.random() * height * 0.4,
		length: Math.random() * 80 + 60,
		speed: Math.random() * 6 + 4,
		angle: startFromLeft
			? Math.PI / 6 + Math.random() * (Math.PI / 6)
			: Math.PI - Math.PI / 6 - Math.random() * (Math.PI / 6),
		opacity: 1,
		decay: Math.random() * 0.01 + 0.008,
		active: true,
	};
}

export function StarField() {
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const starsRef = useRef<Star[]>([]);
	const particlesRef = useRef<Particle[]>([]);
	const shootingStarsRef = useRef<ShootingStar[]>([]);
	const lastShootingStarRef = useRef(0);
	const animationRef = useRef<number>(0);
	const { resolvedTheme } = useTheme();

	const isDark = resolvedTheme === "dark";

	const draw = useCallback(
		({ ctx, width, height, time }: { ctx: CanvasRenderingContext2D; width: number; height: number; time: number }) => {
			ctx.clearRect(0, 0, width, height);

			const globalAlpha = isDark ? 1 : 0.25;
			const starColor = isDark ? "255, 255, 255" : "0, 0, 0";
			const glowColor = isDark ? "100, 140, 255" : "80, 100, 200";

			ctx.save();
			ctx.globalAlpha = globalAlpha;

			for (const star of starsRef.current) {
				const twinkle = Math.sin(time * star.twinkleSpeed + star.twinkleOffset);
				const opacity = star.baseOpacity + twinkle * 0.3;
				if (opacity <= 0) continue;

				ctx.beginPath();
				ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
				ctx.fillStyle = `rgba(${starColor}, ${Math.max(0, Math.min(1, opacity))})`;
				ctx.fill();

				if (star.radius > 1.2) {
					ctx.beginPath();
					ctx.arc(star.x, star.y, star.radius * 3, 0, Math.PI * 2);
					ctx.fillStyle = `rgba(${glowColor}, ${Math.max(0, opacity * 0.15)})`;
					ctx.fill();
				}
			}

			for (const particle of particlesRef.current) {
				particle.x += particle.vx;
				particle.y += particle.vy;

				if (particle.x < 0) particle.x = width;
				if (particle.x > width) particle.x = 0;
				if (particle.y < 0) particle.y = height;
				if (particle.y > height) particle.y = 0;

				const pulse = Math.sin(time * particle.pulseSpeed + particle.pulseOffset);
				particle.opacity = particle.baseOpacity + pulse * 0.15;

				ctx.beginPath();
				ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
				ctx.fillStyle = `rgba(${glowColor}, ${Math.max(0, particle.opacity)})`;
				ctx.fill();

				ctx.beginPath();
				ctx.arc(particle.x, particle.y, particle.radius * 4, 0, Math.PI * 2);
				ctx.fillStyle = `rgba(${glowColor}, ${Math.max(0, particle.opacity * 0.08)})`;
				ctx.fill();
			}

			if (time - lastShootingStarRef.current > SHOOTING_STAR_INTERVAL_MS / 1000 && Math.random() > 0.97) {
				shootingStarsRef.current.push(spawnShootingStar({ width, height }));
				lastShootingStarRef.current = time;
			}

			for (const star of shootingStarsRef.current) {
				if (!star.active) continue;

				star.x += Math.cos(star.angle) * star.speed;
				star.y += Math.sin(star.angle) * star.speed;
				star.opacity -= star.decay;

				if (star.opacity <= 0 || star.x < -100 || star.x > width + 100 || star.y > height + 100) {
					star.active = false;
					continue;
				}

				const tailX = star.x - Math.cos(star.angle) * star.length;
				const tailY = star.y - Math.sin(star.angle) * star.length;

				const gradient = ctx.createLinearGradient(tailX, tailY, star.x, star.y);
				gradient.addColorStop(0, `rgba(${starColor}, 0)`);
				gradient.addColorStop(0.7, `rgba(${glowColor}, ${star.opacity * 0.5})`);
				gradient.addColorStop(1, `rgba(255, 255, 255, ${star.opacity})`);

				ctx.beginPath();
				ctx.moveTo(tailX, tailY);
				ctx.lineTo(star.x, star.y);
				ctx.strokeStyle = gradient;
				ctx.lineWidth = 1.5;
				ctx.stroke();

				ctx.beginPath();
				ctx.arc(star.x, star.y, 2, 0, Math.PI * 2);
				ctx.fillStyle = `rgba(255, 255, 255, ${star.opacity})`;
				ctx.fill();
			}

			shootingStarsRef.current = shootingStarsRef.current.filter((s) => s.active);

			ctx.restore();
		},
		[isDark],
	);

	useEffect(() => {
		const canvas = canvasRef.current;
		if (!canvas) return;

		const ctx = canvas.getContext("2d");
		if (!ctx) return;

		const resize = () => {
			const dpr = window.devicePixelRatio || 1;
			const rect = canvas.getBoundingClientRect();
			canvas.width = rect.width * dpr;
			canvas.height = rect.height * dpr;
			ctx.scale(dpr, dpr);

			starsRef.current = createStars({ width: rect.width, height: rect.height });
			particlesRef.current = createParticles({ width: rect.width, height: rect.height });
		};

		resize();
		window.addEventListener("resize", resize);

		const animate = (timestamp: number) => {
			const time = timestamp / 1000;
			const rect = canvas.getBoundingClientRect();
			draw({ ctx, width: rect.width, height: rect.height, time });
			animationRef.current = requestAnimationFrame(animate);
		};

		animationRef.current = requestAnimationFrame(animate);

		return () => {
			window.removeEventListener("resize", resize);
			cancelAnimationFrame(animationRef.current);
		};
	}, [draw]);

	return (
		<div className="pointer-events-none fixed inset-0 -z-20" aria-hidden="true">
			<canvas ref={canvasRef} className="h-full w-full" tabIndex={-1} />
		</div>
	);
}
