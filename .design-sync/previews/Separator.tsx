import { HorizontalSeparatorGroup, Separator } from "@ngrok/mantle";

export const Horizontal = () => (
	<div className="w-full max-w-md">
		<div className="space-y-1">
			<h4 className="text-strong text-sm font-medium leading-none">mantle</h4>
			<p className="text-muted text-sm">ngrok’s open-source UI component library.</p>
		</div>
		<Separator className="my-4" />
		<div className="space-y-1">
			<h4 className="text-strong text-sm font-medium leading-none">ngrok agent</h4>
			<p className="text-muted text-sm">Secure ingress for any app, on any network.</p>
		</div>
	</div>
);

export const Vertical = () => (
	<div className="text-body flex h-5 items-center gap-4 text-sm">
		<span>Blog</span>
		<Separator orientation="vertical" />
		<span>Docs</span>
		<Separator orientation="vertical" />
		<span>Pricing</span>
		<Separator orientation="vertical" />
		<span>Status</span>
	</div>
);

export const LabeledGroup = () => (
	<div className="flex w-full max-w-md flex-col gap-6">
		<HorizontalSeparatorGroup>
			<Separator />
			<span className="text-muted text-sm">or continue with</span>
			<Separator />
		</HorizontalSeparatorGroup>
		<HorizontalSeparatorGroup>
			<h3 className="text-strong text-sm font-medium">Endpoints</h3>
			<Separator />
		</HorizontalSeparatorGroup>
	</div>
);
