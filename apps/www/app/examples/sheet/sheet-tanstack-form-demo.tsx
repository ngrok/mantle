import { Button } from "@ngrok/mantle/button";
import { Field, toErrorMessages } from "@ngrok/mantle/field";
import { Input } from "@ngrok/mantle/input";
import { Sheet } from "@ngrok/mantle/sheet";
import { TextArea } from "@ngrok/mantle/text-area";
import { useForm } from "@tanstack/react-form";
import { useState } from "react";
import { z } from "zod";

const formSchema = z.object({
	name: z.string().min(1, "Name your API key."),
	note: z.string().max(280, "Keep the note under 280 characters."),
});

/**
 * Demonstrates a `Sheet` composed with TanStack Form: a `display: contents`
 * form wraps `Sheet.Body` and `Sheet.Footer` so the submit button lives in
 * the footer, fields validate on submit, and the sheet closes (and the form
 * resets) when the form submits successfully.
 *
 * @example
 * <TanStackFormDemo />
 */
export function TanStackFormDemo() {
	const [open, setOpen] = useState(false);
	const form = useForm({
		defaultValues: {
			name: "",
			note: "",
		},
		validators: {
			onSubmit: formSchema,
		},
		onSubmit: ({ value }) => {
			window.alert(`Submitted: ${JSON.stringify(value, null, 2)}`);
			handleOpenChange(false);
		},
	});

	const handleOpenChange = (nextOpen: boolean) => {
		setOpen(nextOpen);
		if (!nextOpen) {
			form.reset();
		}
	};

	return (
		<Sheet.Root open={open} onOpenChange={handleOpenChange}>
			<Sheet.Trigger asChild>
				<Button type="button" appearance="filled" priority="neutral">
					New API key
				</Button>
			</Sheet.Trigger>
			<Sheet.Content>
				<Sheet.Header>
					<Sheet.TitleGroup>
						<Sheet.Title>New API key</Sheet.Title>
						<Sheet.Actions>
							<Sheet.CloseIconButton />
						</Sheet.Actions>
					</Sheet.TitleGroup>
					<Sheet.Description>
						Create a key for programmatic access to the ngrok API.
					</Sheet.Description>
				</Sheet.Header>
				<form
					className="contents"
					onSubmit={(event) => {
						event.preventDefault();
						event.stopPropagation();
						void form.handleSubmit();
					}}
				>
					<Sheet.Body className="space-y-4">
						<form.Field name="name">
							{(field) => (
								<Field.Item name={field.name}>
									<Field.Label>Name</Field.Label>
									<Field.Control>
										<Input
											placeholder="production-deploys"
											value={field.state.value}
											onBlur={field.handleBlur}
											onChange={(event) => field.handleChange(event.target.value)}
										/>
									</Field.Control>
									<Field.Errors messages={toErrorMessages(field.state.meta.errors)} />
								</Field.Item>
							)}
						</form.Field>
						<form.Field name="note">
							{(field) => (
								<Field.Item name={field.name}>
									<Field.Label>Note</Field.Label>
									<Field.Control>
										<TextArea
											placeholder="What is this key used for?"
											value={field.state.value}
											onBlur={field.handleBlur}
											onChange={(event) => field.handleChange(event.target.value)}
										/>
									</Field.Control>
									<Field.Description>
										Optional. Help your team know where this key is used.
									</Field.Description>
									<Field.Errors messages={toErrorMessages(field.state.meta.errors)} />
								</Field.Item>
							)}
						</form.Field>
					</Sheet.Body>
					<Sheet.Footer>
						<Sheet.Close asChild>
							<Button type="button" appearance="outlined" priority="neutral">
								Cancel
							</Button>
						</Sheet.Close>
						<Button type="submit" appearance="filled" priority="neutral">
							Create key
						</Button>
					</Sheet.Footer>
				</form>
			</Sheet.Content>
		</Sheet.Root>
	);
}
