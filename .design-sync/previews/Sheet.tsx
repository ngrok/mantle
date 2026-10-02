import {
	Button,
	IconButton,
	ListMagnifyingGlassIcon,
	Separator,
	Sheet,
	TerminalWindowIcon,
	TrashSimpleIcon,
} from "@ngrok/mantle";

export const EndpointDetails = () => (
	<Sheet.Root defaultOpen modal={false}>
		<Sheet.Trigger asChild>
			<Button type="button" appearance="filled" intent="neutral">
				View endpoint
			</Button>
		</Sheet.Trigger>
		<Sheet.Content>
			<Sheet.Header>
				<Sheet.TitleGroup>
					<Sheet.Title>api.example.ngrok.app</Sheet.Title>
					<Sheet.Actions>
						<IconButton
							appearance="ghost"
							intent="neutral"
							type="button"
							icon={<TerminalWindowIcon />}
							label="Start an agent"
						/>
						<IconButton
							appearance="ghost"
							intent="neutral"
							type="button"
							icon={<ListMagnifyingGlassIcon />}
							label="See traffic"
						/>
						<IconButton
							appearance="ghost"
							intent="neutral"
							type="button"
							icon={<TrashSimpleIcon />}
							label="Delete"
						/>
						<Separator orientation="vertical" className="h-[80%]" />
						<Sheet.CloseIconButton />
					</Sheet.Actions>
				</Sheet.TitleGroup>
				<Sheet.Description>
					Cloud endpoint in the global region, created 3 days ago.
				</Sheet.Description>
			</Sheet.Header>
			<Sheet.Body className="space-y-4 text-sm">
				<p>
					This endpoint forwards traffic to the internal service https://checkout.internal on port
					8080. Two agents in us-cal-1 and de-fra-1 serve it.
				</p>
				<p>
					Its Traffic Policy adds OAuth with Google, a rate limit of 100 requests per minute per
					client IP, and an X-Forwarded-Host header rewrite.
				</p>
				<p>
					In the last 24 hours it served 182,431 requests with a p95 latency of 84 ms and an error
					rate of 0.2%.
				</p>
			</Sheet.Body>
			<Sheet.Footer>
				<Sheet.Close asChild>
					<Button type="button" appearance="outlined" intent="neutral">
						Close
					</Button>
				</Sheet.Close>
				<Button type="button" appearance="filled" intent="neutral">
					Edit policy
				</Button>
			</Sheet.Footer>
		</Sheet.Content>
	</Sheet.Root>
);
