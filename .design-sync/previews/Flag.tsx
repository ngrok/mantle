import { Flag } from "@ngrok/mantle";

export const Sizes = () => (
	<div className="flex items-end gap-4">
		<Flag code="US" size="s" loading="eager" />
		<Flag code="US" size="m" loading="eager" />
		<Flag code="US" size="l" loading="eager" />
	</div>
);

const regions = [
	{ code: "US", name: "United States (Ohio)", id: "us" },
	{ code: "DE", name: "Europe (Frankfurt)", id: "eu" },
	{ code: "JP", name: "Japan (Tokyo)", id: "jp" },
	{ code: "BR", name: "South America (São Paulo)", id: "sa" },
	{ code: "AU", name: "Australia (Sydney)", id: "au" },
	{ code: "IN", name: "India (Mumbai)", id: "in" },
] as const;

export const RegionList = () => (
	<ul className="flex flex-col gap-2 text-sm">
		{regions.map((region) => (
			<li key={region.id} className="flex items-center gap-2">
				<Flag code={region.code} size="m" loading="eager" />
				<span className="text-strong">{region.name}</span>
				<code className="text-muted font-mono text-xs">{region.id}</code>
			</li>
		))}
	</ul>
);

export const Countries = () => (
	<div className="flex items-center gap-3">
		<Flag code="US" loading="eager" />
		<Flag code="JP" loading="eager" />
		<Flag code="ES" loading="eager" />
		<Flag code="GB" loading="eager" />
		<Flag code="CA" loading="eager" />
	</div>
);
