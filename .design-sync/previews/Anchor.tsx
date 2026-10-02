import { Anchor, ArrowSquareOutIcon, BookIcon, DownloadSimpleIcon } from "@ngrok/mantle";

export const InProse = () => (
	<p className="max-w-md text-sm">
		Point your agent at a reserved domain, then read the{" "}
		<Anchor href="https://ngrok.com/docs/universal-gateway/domains/">domains guide</Anchor> to add a
		custom certificate.
	</p>
);

export const WithIcons = () => (
	<div className="flex flex-col gap-2 text-sm">
		<Anchor href="https://ngrok.com/docs" icon={<BookIcon />}>
			ngrok docs
		</Anchor>
		<Anchor
			href="https://dashboard.ngrok.com"
			icon={<ArrowSquareOutIcon />}
			iconPlacement="end"
			target="_blank"
		>
			Open the ngrok dashboard
		</Anchor>
		<Anchor href="https://ngrok.com/download" icon={<DownloadSimpleIcon />}>
			Download the ngrok agent
		</Anchor>
	</div>
);
