import { Button, Empty, MagnifyingGlassIcon, PlusIcon, Well } from "@ngrok/mantle";

export const EmptyState = () => (
	<Well className="w-full max-w-lg">
		<Empty.Root>
			<Empty.Icon svg={<MagnifyingGlassIcon />} />
			<Empty.Title>No matching endpoints</Empty.Title>
			<Empty.Description>
				<p>Try a different hostname or clear the region filter.</p>
			</Empty.Description>
			<Empty.Actions>
				<Button type="button" appearance="outlined" intent="neutral">
					Clear filters
				</Button>
			</Empty.Actions>
		</Empty.Root>
	</Well>
);

export const NoAgentsYet = () => (
	<Well asChild className="w-full max-w-lg">
		<section aria-label="Agents">
			<Empty.Root>
				<Empty.Icon svg={<PlusIcon />} />
				<Empty.Title>No agents online</Empty.Title>
				<Empty.Description>
					<p>Install the ngrok agent and start your first tunnel to see it here.</p>
				</Empty.Description>
				<Empty.Actions>
					<Button type="button" appearance="filled" intent="neutral" icon={<PlusIcon />}>
						Add an agent
					</Button>
				</Empty.Actions>
			</Empty.Root>
		</section>
	</Well>
);

export const ReadOnlySummary = () => (
	<Well className="w-full max-w-lg p-4">
		<p className="text-muted mb-2 text-xs font-medium uppercase">Current plan</p>
		<dl className="grid grid-cols-2 gap-y-1 text-sm">
			<dt className="text-muted">Plan</dt>
			<dd className="text-strong">Pay-as-you-go</dd>
			<dt className="text-muted">Endpoints</dt>
			<dd className="text-strong">12 active</dd>
			<dt className="text-muted">Renews</dt>
			<dd className="text-strong">Nov 1, 2026</dd>
		</dl>
	</Well>
);
