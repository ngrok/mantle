import { Breadcrumb } from "@ngrok/mantle";

export const Default = () => (
	<Breadcrumb.Root>
		<Breadcrumb.List>
			<Breadcrumb.Item>
				<Breadcrumb.Link href="#">Home</Breadcrumb.Link>
			</Breadcrumb.Item>
			<Breadcrumb.Separator />
			<Breadcrumb.Item>
				<Breadcrumb.Link href="#">Endpoints</Breadcrumb.Link>
			</Breadcrumb.Item>
			<Breadcrumb.Separator />
			<Breadcrumb.Item>
				<Breadcrumb.Page>ep_2h8xyz</Breadcrumb.Page>
			</Breadcrumb.Item>
		</Breadcrumb.List>
	</Breadcrumb.Root>
);

export const SlashSeparator = () => (
	<Breadcrumb.Root>
		<Breadcrumb.List>
			<Breadcrumb.Item>
				<Breadcrumb.Link href="#">Home</Breadcrumb.Link>
			</Breadcrumb.Item>
			<Breadcrumb.Separator>
				<span>/</span>
			</Breadcrumb.Separator>
			<Breadcrumb.Item>
				<Breadcrumb.Link href="#">Domains</Breadcrumb.Link>
			</Breadcrumb.Item>
			<Breadcrumb.Separator>
				<span>/</span>
			</Breadcrumb.Separator>
			<Breadcrumb.Item>
				<Breadcrumb.Page>app.example.com</Breadcrumb.Page>
			</Breadcrumb.Item>
		</Breadcrumb.List>
	</Breadcrumb.Root>
);

export const LabelPrefix = () => (
	<Breadcrumb.Root>
		<Breadcrumb.List>
			<Breadcrumb.Item>
				<Breadcrumb.Label>Settings</Breadcrumb.Label>
			</Breadcrumb.Item>
			<Breadcrumb.Separator />
			<Breadcrumb.Item>
				<Breadcrumb.Page>API Keys</Breadcrumb.Page>
			</Breadcrumb.Item>
		</Breadcrumb.List>
	</Breadcrumb.Root>
);

export const Loading = () => (
	<Breadcrumb.Root>
		<Breadcrumb.List>
			<Breadcrumb.Item>
				<Breadcrumb.Link href="#">Agents</Breadcrumb.Link>
			</Breadcrumb.Item>
			<Breadcrumb.Separator />
			<Breadcrumb.Skeleton className="w-40" />
		</Breadcrumb.List>
	</Breadcrumb.Root>
);

export const Overflow = () => (
	<div className="border-card-muted bg-card flex w-full max-w-sm items-center gap-2 rounded-lg border px-4 py-3">
		<Breadcrumb.Root>
			<Breadcrumb.List>
				<Breadcrumb.Item>
					<Breadcrumb.Link href="#">Acme Corp</Breadcrumb.Link>
				</Breadcrumb.Item>
				<Breadcrumb.Separator />
				<Breadcrumb.Item>
					<Breadcrumb.Link href="#">Endpoints</Breadcrumb.Link>
				</Breadcrumb.Item>
				<Breadcrumb.Separator />
				<Breadcrumb.Item>
					<Breadcrumb.Link href="#">Cloud Endpoints</Breadcrumb.Link>
				</Breadcrumb.Item>
				<Breadcrumb.Separator />
				<Breadcrumb.Item>
					<Breadcrumb.Link href="#">Traffic Policy</Breadcrumb.Link>
				</Breadcrumb.Item>
				<Breadcrumb.Separator />
				<Breadcrumb.Item>
					<Breadcrumb.Page>ep_2h8xyz</Breadcrumb.Page>
				</Breadcrumb.Item>
			</Breadcrumb.List>
		</Breadcrumb.Root>
	</div>
);
