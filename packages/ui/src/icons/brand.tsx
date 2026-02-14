export function OcVercelIcon({ className }: { className?: string }) {
	return (
		<svg
			className={className}
			width="20"
			height="18"
			viewBox="0 0 76 65"
			fill="none"
			xmlns="http://www.w3.org/2000/svg"
		>
			<title>Vercel</title>
			<path d="M37.5274 0L75.0548 65H0L37.5274 0Z" fill="currentColor" />
		</svg>
	);
}

export function OcDataBuddyIcon({
	className = "",
	size = 32,
}: {
	className?: string;
	size?: number;
}) {
	return (
		<svg
			xmlns="http://www.w3.org/2000/svg"
			width={size}
			height={size}
			className={className}
			viewBox="0 0 8 8"
			shapeRendering="crispEdges"
		>
			<title>Data Buddy</title>
			<path d="M0 0h8v8H0z" />
			<path
				fill="#fff"
				d="M1 1h1v6H1zm1 0h4v1H2zm4 1h1v1H6zm0 1h1v1H6zm0 1h1v1H6zm0 1h1v1H6zM2 6h4v1H2zm1-3h1v1H3zm1 1h1v1H4z"
			/>
		</svg>
	);
}
