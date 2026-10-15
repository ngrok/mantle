import {
	Button,
	Empty,
	MagnifyingGlassIcon,
	PlusIcon,
	RobotIcon,
	SmileyMeltingIcon,
} from "@ngrok/mantle";

export const NoEndpoints = () => (
	<Empty.Root>
		<Empty.Icon svg={<RobotIcon />} />
		<Empty.Title>No endpoints yet</Empty.Title>
		<Empty.Description>
			<p>Create your first endpoint to start routing traffic to your agents.</p>
		</Empty.Description>
		<Empty.Actions>
			<Button type="button" appearance="filled" intent="neutral" icon={<PlusIcon />}>
				Create endpoint
			</Button>
		</Empty.Actions>
	</Empty.Root>
);

export const ErrorPage = () => (
	<Empty.Root>
		<Empty.Icon svg={<SmileyMeltingIcon />} />
		<Empty.Title>Oops, something went wrong.</Empty.Title>
		<Empty.Description>
			<p>We couldn’t load your traffic inspector. Please try again in a few minutes.</p>
		</Empty.Description>
		<Empty.Actions>
			<Button type="button" appearance="outlined" intent="neutral">
				Retry
			</Button>
		</Empty.Actions>
	</Empty.Root>
);

export const NoFilterResults = () => (
	<Empty.Root>
		<Empty.Icon svg={<MagnifyingGlassIcon />} />
		<Empty.Title>No domains matched your filter.</Empty.Title>
		<Empty.Description>
			<p>Check your spelling. It’s possible the domain you’re looking for was deleted.</p>
		</Empty.Description>
		<Empty.Actions>
			<Button type="button" appearance="outlined" intent="neutral">
				Clear filters
			</Button>
		</Empty.Actions>
	</Empty.Root>
);

export const Minimal = () => (
	<Empty.Root>
		<Empty.Icon svg={<RobotIcon />} />
		<Empty.Title>No agents online</Empty.Title>
	</Empty.Root>
);
