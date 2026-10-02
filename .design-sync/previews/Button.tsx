import { Button, FireIcon, PlusIcon } from "@ngrok/mantle";

const appearances = ["filled", "outlined", "ghost", "link"] as const;

function Row({ intent }: { intent: "neutral" | "accent" | "danger" }) {
	return (
		<div className="flex items-center gap-2">
			{appearances.map((appearance) => (
				<Button key={appearance} appearance={appearance} intent={intent}>
					{appearance[0].toUpperCase() + appearance.slice(1)}
				</Button>
			))}
		</div>
	);
}

export const Neutral = () => <Row intent="neutral" />;

export const Accent = () => <Row intent="accent" />;

export const Danger = () => <Row intent="danger" />;

export const Sizes = () => (
	<div className="flex items-center gap-2">
		<Button appearance="outlined" intent="neutral" size="xs">
			Extra small
		</Button>
		<Button appearance="outlined" intent="neutral" size="sm">
			Small
		</Button>
		<Button appearance="outlined" intent="neutral" size="md">
			Medium
		</Button>
		<Button appearance="outlined" intent="neutral" size="lg">
			Large
		</Button>
	</div>
);

export const WithIcon = () => (
	<div className="flex items-center gap-2">
		<Button appearance="filled" intent="neutral" icon={<PlusIcon />}>
			Create endpoint
		</Button>
		<Button
			appearance="outlined"
			intent="neutral"
			icon={<FireIcon weight="fill" />}
			iconPlacement="end"
		>
			Deploy
		</Button>
	</div>
);

export const Loading = () => (
	<div className="flex items-center gap-2">
		<Button appearance="filled" intent="neutral" isLoading>
			Saving
		</Button>
		<Button appearance="outlined" intent="neutral" disabled>
			Disabled
		</Button>
	</div>
);
