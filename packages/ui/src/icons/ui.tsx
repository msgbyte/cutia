export function OcVideoIcon({
	className = "",
	size = 32,
}: {
	className?: string;
	size?: number;
}) {
	return (
		<svg
			width={size}
			height={size}
			className={className}
			viewBox="0 0 29 24"
			fill="none"
			xmlns="http://www.w3.org/2000/svg"
		>
			<title>Video</title>
			<path
				d="M2.41667 11C2.41667 7.70017 2.41667 6.05025 3.65537 5.02513C4.89405 4 6.88771 4 10.875 4H12.0833C16.0706 4 18.0642 4 19.303 5.02513C20.5417 6.05025 20.5417 7.70017 20.5417 11V13C20.5417 16.2998 20.5417 17.9497 19.303 18.9749C18.0642 20 16.0706 20 12.0833 20H10.875C6.88771 20 4.89405 20 3.65537 18.9749C2.41667 17.9497 2.41667 16.2998 2.41667 13V11Z"
				stroke="currentColor"
				strokeWidth="1.5"
				strokeLinecap="round"
			/>
			<path
				d="M20.5417 8.90585L20.6938 8.80196C23.2504 7.05623 24.5287 6.18336 25.556 6.60482C26.5833 7.02628 26.5833 8.42355 26.5833 11.2181V12.7819C26.5833 15.5765 26.5833 16.9737 25.556 17.3952C24.5287 17.8166 23.2504 16.9438 20.6938 15.198L20.5417 15.0941"
				stroke="currentColor"
				strokeWidth="1.5"
				strokeLinecap="round"
			/>
		</svg>
	);
}
