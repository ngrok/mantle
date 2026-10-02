import { Button, Input, Popover } from "@ngrok/mantle";

export const RateLimitSettings = () => (
	<Popover.Root defaultOpen>
		<Popover.Trigger asChild>
			<Button type="button" appearance="filled" intent="neutral">
				Rate limit
			</Button>
		</Popover.Trigger>
		<Popover.Content preferredWidth="max-w-96" align="start">
			<form
				className="grid gap-4"
				onSubmit={(event) => {
					event.preventDefault();
				}}
			>
				<div className="space-y-2">
					<h4 className="text-strong font-medium leading-none">Rate limit</h4>
					<p className="text-muted text-sm">
						Limit requests to api.example.ngrok.app per client IP.
					</p>
				</div>
				<div className="grid gap-2">
					<div className="grid grid-cols-3 items-center gap-4">
						<label htmlFor="popover-capacity" className="text-sm">
							Capacity
						</label>
						<Input id="popover-capacity" defaultValue="100" className="col-span-2 h-8" />
					</div>
					<div className="grid grid-cols-3 items-center gap-4">
						<label htmlFor="popover-window" className="text-sm">
							Window
						</label>
						<Input id="popover-window" defaultValue="60s" className="col-span-2 h-8" />
					</div>
				</div>
			</form>
		</Popover.Content>
	</Popover.Root>
);
