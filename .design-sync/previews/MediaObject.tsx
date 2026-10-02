import { Avatar, GlobeIcon, Icon, MediaObject, TerminalWindowIcon } from "@ngrok/mantle";

export const Comment = () => (
	<MediaObject.Root className="w-full max-w-md items-start gap-3">
		<MediaObject.Media>
			<Avatar.Root className="size-10 rounded-full">
				<Avatar.Fallback name="Ada Lovelace" />
			</Avatar.Root>
		</MediaObject.Media>
		<MediaObject.Content>
			<p className="text-strong text-sm font-medium">
				Ada Lovelace <span className="text-muted font-normal">· 2h ago</span>
			</p>
			<p className="text-body mt-1 text-sm">
				Rotated the staging API key. Update the CI secret before the next deploy.
			</p>
		</MediaObject.Content>
	</MediaObject.Root>
);

export const IconListItem = () => (
	<div className="flex w-full max-w-md flex-col gap-4">
		<MediaObject.Root className="items-center gap-3">
			<MediaObject.Media>
				<Icon svg={<GlobeIcon />} className="text-muted size-6" />
			</MediaObject.Media>
			<MediaObject.Content>
				<p className="text-strong text-sm font-medium">api.example.com</p>
				<p className="text-muted text-sm">Cloud endpoint · us-cal-1</p>
			</MediaObject.Content>
		</MediaObject.Root>
		<MediaObject.Root className="items-center gap-3">
			<MediaObject.Media>
				<Icon svg={<TerminalWindowIcon />} className="text-muted size-6" />
			</MediaObject.Media>
			<MediaObject.Content>
				<p className="text-strong text-sm font-medium">billing-agent-01</p>
				<p className="text-muted text-sm">Agent endpoint · eu-west-1</p>
			</MediaObject.Content>
		</MediaObject.Root>
	</div>
);

export const AsLink = () => (
	<MediaObject.Root asChild className="w-full max-w-md items-center gap-3 rounded-md p-2">
		<a href="https://ngrok.com/docs">
			<MediaObject.Media>
				<Avatar.Root className="size-10 rounded-md">
					<Avatar.Fallback name="Traffic Policy" />
				</Avatar.Root>
			</MediaObject.Media>
			<MediaObject.Content>
				<p className="text-strong text-sm font-medium">Traffic Policy guide</p>
				<p className="text-muted text-sm">Add auth, rate limits, and rewrites to any endpoint.</p>
			</MediaObject.Content>
		</a>
	</MediaObject.Root>
);
