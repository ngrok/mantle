import { Field, TextArea } from "@ngrok/mantle";

export const Default = () => (
	<Field.Item className="w-full max-w-md" name="description">
		<Field.Label>Description</Field.Label>
		<Field.Control>
			<TextArea placeholder="What does this endpoint serve?" />
		</Field.Control>
		<Field.Description>Visible to everyone in your account.</Field.Description>
	</Field.Item>
);

export const Monospaced = () => (
	<Field.Item className="w-full max-w-md" name="traffic-policy">
		<Field.Label>Traffic policy</Field.Label>
		<Field.Control>
			<TextArea
				appearance="monospaced"
				rows={6}
				defaultValue={`on_http_request:
  - actions:
      - type: rate-limit
        config:
          capacity: 100
          rate: 60s`}
			/>
		</Field.Control>
	</Field.Item>
);

export const Validation = () => (
	<div className="flex w-full max-w-md flex-col gap-4">
		<Field.Item name="feedback-error">
			<Field.Label>Feedback</Field.Label>
			<Field.Control>
				<TextArea validation="error" placeholder="Tell us about your experience…" />
			</Field.Control>
			<Field.Errors messages={["Please enter your feedback."]} />
		</Field.Item>
		<Field.Item name="feedback-success">
			<Field.Label>Feedback</Field.Label>
			<Field.Control>
				<TextArea
					validation="success"
					defaultValue="The new Traffic Inspector made debugging webhooks much faster."
				/>
			</Field.Control>
		</Field.Item>
	</div>
);

export const Disabled = () => (
	<Field.Item className="w-full max-w-md" name="notes">
		<Field.Label>Notes</Field.Label>
		<Field.Control>
			<TextArea disabled defaultValue="Managed by Terraform. Edit the module instead." />
		</Field.Control>
	</Field.Item>
);
