import { GlobeIcon, List, LockKeyIcon, ShieldCheckIcon } from "@ngrok/mantle";

const accounts = [
	{ id: "acc_personal", name: "Cody Price", plan: "Pay-as-you-go", members: 2 },
	{ id: "acc_acme", name: "Acme Corp", plan: "Enterprise", members: 48 },
	{ id: "acc_staging", name: "acme-staging", plan: "Free", members: 6 },
];

export const AccountSwitcher = () => (
	<List.Root aria-label="Your accounts" className="w-72">
		{accounts.map((account) => (
			<List.Item key={account.id} current={account.id === "acc_acme"} onClick={() => {}}>
				<List.ItemTitle>{account.name}</List.ItemTitle>
				<List.ItemDescription>
					{account.plan} · {account.members} members
				</List.ItemDescription>
			</List.Item>
		))}
	</List.Root>
);

export const TitlesOnly = () => (
	<List.Root aria-label="Regions" className="w-56">
		<List.Item onClick={() => {}}>
			<List.ItemTitle>us-east</List.ItemTitle>
		</List.Item>
		<List.Item onClick={() => {}}>
			<List.ItemTitle>eu-central</List.ItemTitle>
		</List.Item>
		<List.Item current onClick={() => {}}>
			<List.ItemTitle>ap-southeast</List.ItemTitle>
		</List.Item>
		<List.Item onClick={() => {}}>
			<List.ItemTitle>sa-east</List.ItemTitle>
		</List.Item>
	</List.Root>
);

const providers = [
	{ id: "okta", name: "Okta SAML", owner: "Managed by IT", Icon: ShieldCheckIcon },
	{ id: "google", name: "Google Workspace", owner: "acme.com", Icon: GlobeIcon },
	{ id: "oidc", name: "Custom OIDC", owner: "auth.acme.com", Icon: LockKeyIcon },
];

export const WithIcons = () => (
	<List.Root aria-label="Identity providers" className="w-80">
		{providers.map((provider) => (
			<List.Item key={provider.id} asChild className="py-2.5">
				<a href={`#${provider.id}`}>
					<div className="flex items-center gap-3">
						<provider.Icon weight="duotone" className="text-accent-600 size-8 shrink-0" />
						<div className="flex flex-col gap-0.5">
							<List.ItemTitle>{provider.name}</List.ItemTitle>
							<List.ItemDescription>{provider.owner}</List.ItemDescription>
						</div>
					</div>
				</a>
			</List.Item>
		))}
	</List.Root>
);
