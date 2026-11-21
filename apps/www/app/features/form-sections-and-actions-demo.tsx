import { Button } from "@ngrok/mantle/button";
import { Checkbox } from "@ngrok/mantle/checkbox";
import { Choice } from "@ngrok/mantle/choice";
import { Field } from "@ngrok/mantle/field";
import { Input } from "@ngrok/mantle/input";
import { Strata } from "@ngrok/mantle/strata";
import { TextArea } from "@ngrok/mantle/text-area";
import { type SubmitEvent, useState } from "react";

/** Stands in for your API call. */
function createEndpoint(): Promise<void> {
	return new Promise((resolve) => {
		setTimeout(resolve, 1000);
	});
}

export function CreateEndpointForm() {
	const [isPending, setIsPending] = useState(false);

	async function submit(event: SubmitEvent<HTMLFormElement>) {
		event.preventDefault();
		const form = event.currentTarget;
		setIsPending(true);
		await createEndpoint().finally(() => setIsPending(false));
		form.reset();
	}

	return (
		<form className="w-full" onSubmit={(event) => void submit(event)}>
			<Strata.Root asChild>
				<fieldset disabled={isPending}>
					<Strata.Section>
						<Strata.Header>
							<Strata.Title>General</Strata.Title>
							<Strata.Description>How the endpoint shows in the dashboard.</Strata.Description>
						</Strata.Header>
						<Strata.Body>
							<Field.Group>
								<Field.Item name="name">
									<Field.Label>Name</Field.Label>
									<Field.Control>
										<Input placeholder="api-staging" required />
									</Field.Control>
								</Field.Item>
								<Field.Item name="description">
									<Field.Label className="flex items-baseline gap-1">
										Description <Field.Optional />
									</Field.Label>
									<Field.Control>
										<TextArea placeholder="Staging API for the mobile app" />
									</Field.Control>
								</Field.Item>
							</Field.Group>
						</Strata.Body>
					</Strata.Section>
					<Strata.Section>
						<Strata.Header>
							<Strata.Title>Upstream</Strata.Title>
							<Strata.Description>Where the endpoint forwards its traffic.</Strata.Description>
						</Strata.Header>
						<Strata.Body>
							<Field.Item name="upstream">
								<Field.Label>Upstream URL</Field.Label>
								<Field.Control>
									<Input type="url" placeholder="http://localhost:8080" />
								</Field.Control>
								<Field.Description>A URL that your agent can reach.</Field.Description>
							</Field.Item>
						</Strata.Body>
					</Strata.Section>
					<Strata.Section>
						<Strata.Header>
							<Strata.Title>Access</Strata.Title>
							<Strata.Description>Who can send traffic to the endpoint.</Strata.Description>
						</Strata.Header>
						<Strata.Body>
							<Choice.Root name="requireSignIn">
								<Choice.Indicator>
									<Checkbox />
								</Choice.Indicator>
								<Choice.Content>
									<Choice.Label>Require sign-in</Choice.Label>
									<Choice.Description>
										Visitors sign in with Google before their requests reach the upstream.
									</Choice.Description>
								</Choice.Content>
							</Choice.Root>
						</Strata.Body>
					</Strata.Section>
				</fieldset>
			</Strata.Root>
			<div className="border-card-muted flex justify-end gap-2 border-t pt-6">
				<Button type="reset" appearance="outlined" intent="neutral" disabled={isPending}>
					Cancel
				</Button>
				<Button type="submit" appearance="filled" intent="neutral" isLoading={isPending}>
					Create endpoint
				</Button>
			</div>
		</form>
	);
}
