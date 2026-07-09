import { Button } from "@ngrok/mantle/button";
import { Dialog } from "@ngrok/mantle/dialog";
import { Field, toErrorMessages } from "@ngrok/mantle/field";
import { Input } from "@ngrok/mantle/input";
import { Select } from "@ngrok/mantle/select";
import { useForm } from "@tanstack/react-form";
import { useState } from "react";
import { z } from "zod";

const formSchema = z.object({
	email: z.email("Enter a valid email address."),
	role: z.string().min(1, "Choose a role."),
});

/**
 * Demonstrates a `Dialog` composed with TanStack Form: a `display: contents`
 * form wraps `Dialog.Body` and `Dialog.Footer` so the submit button lives in
 * the footer, fields validate on submit, and the dialog closes (and the form
 * resets) when the form submits successfully.
 *
 * @example
 * <TanStackFormDemo />
 */
export function TanStackFormDemo() {
	const [open, setOpen] = useState(false);
	const form = useForm({
		defaultValues: {
			email: "",
			role: "",
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
		<Dialog.Root open={open} onOpenChange={handleOpenChange}>
			<Dialog.Trigger asChild>
				<Button type="button" appearance="filled" priority="neutral">
					Invite a teammate
				</Button>
			</Dialog.Trigger>
			<Dialog.Content>
				<Dialog.Header>
					<Dialog.Title>Invite a teammate</Dialog.Title>
					<Dialog.CloseIconButton />
				</Dialog.Header>
				<form
					className="contents"
					onSubmit={(event) => {
						event.preventDefault();
						event.stopPropagation();
						void form.handleSubmit();
					}}
				>
					<Dialog.Body className="space-y-4">
						<form.Field name="email">
							{(field) => (
								<Field.Item name={field.name}>
									<Field.Label>Email</Field.Label>
									<Field.Control>
										<Input
											type="email"
											placeholder="teammate@example.com"
											value={field.state.value}
											onBlur={field.handleBlur}
											onChange={(event) => field.handleChange(event.target.value)}
										/>
									</Field.Control>
									<Field.Errors messages={toErrorMessages(field.state.meta.errors)} />
								</Field.Item>
							)}
						</form.Field>
						<form.Field name="role">
							{(field) => (
								<Field.Item name={field.name}>
									<Field.Label>Role</Field.Label>
									<Field.Control>
										<Select.Root
											value={field.state.value}
											onBlur={field.handleBlur}
											onValueChange={field.handleChange}
										>
											<Select.Trigger>
												<Select.Value placeholder="Select a role" />
											</Select.Trigger>
											<Select.Content width="trigger">
												<Select.Item value="admin">Admin</Select.Item>
												<Select.Item value="developer">Developer</Select.Item>
												<Select.Item value="read-only">Read-only</Select.Item>
											</Select.Content>
										</Select.Root>
									</Field.Control>
									<Field.Errors messages={toErrorMessages(field.state.meta.errors)} />
								</Field.Item>
							)}
						</form.Field>
					</Dialog.Body>
					<Dialog.Footer>
						<Dialog.Close asChild>
							<Button type="button" appearance="outlined" priority="neutral">
								Cancel
							</Button>
						</Dialog.Close>
						<Button type="submit" appearance="filled" priority="neutral">
							Send invite
						</Button>
					</Dialog.Footer>
				</form>
			</Dialog.Content>
		</Dialog.Root>
	);
}
