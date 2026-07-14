import { AlertDialog } from "@ngrok/mantle/alert-dialog";
import { Button } from "@ngrok/mantle/button";
import { Checkbox } from "@ngrok/mantle/checkbox";
import { Choice } from "@ngrok/mantle/choice";
import { Field, toErrorMessages } from "@ngrok/mantle/field";
import { useForm } from "@tanstack/react-form";
import { useState } from "react";
import { z } from "zod";

const formSchema = z.object({
	acknowledged: z.boolean().refine((value) => value, "Acknowledge the consequences to continue."),
});

/**
 * Demonstrates an `AlertDialog` composed with TanStack Form: a single
 * acknowledgment checkbox gates the destructive action, `AlertDialog.Action`
 * is the form's submit button, and the dialog closes (and the form resets)
 * when the form submits successfully.
 *
 * @example
 * <TanStackFormDemo />
 */
export function TanStackFormDemo() {
	const [open, setOpen] = useState(false);
	const form = useForm({
		defaultValues: {
			acknowledged: false,
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
		<AlertDialog.Root intent="danger" open={open} onOpenChange={handleOpenChange}>
			<AlertDialog.Trigger asChild>
				<Button type="button" appearance="outlined" intent="danger">
					Release domain
				</Button>
			</AlertDialog.Trigger>
			<AlertDialog.Content>
				<AlertDialog.Icon />
				<AlertDialog.Body asChild>
					<form
						onSubmit={(event) => {
							event.preventDefault();
							event.stopPropagation();
							void form.handleSubmit();
						}}
					>
						<AlertDialog.Header>
							<AlertDialog.Title>Release this domain?</AlertDialog.Title>
							<AlertDialog.Description>
								Releasing example.ngrok.app immediately removes it from your account.
							</AlertDialog.Description>
						</AlertDialog.Header>
						<form.Field name="acknowledged">
							{(field) => (
								<Field.Item name={field.name}>
									<Field.Control>
										<Choice.Root>
											<Choice.Indicator>
												<Checkbox
													checked={field.state.value}
													onBlur={field.handleBlur}
													onChange={(event) => field.handleChange(event.target.checked)}
												/>
											</Choice.Indicator>
											<Choice.Content>
												<Choice.Label>I understand the consequences</Choice.Label>
												<Choice.Description>
													Endpoints still using this domain will go offline, and the domain may be
													claimed by another account.
												</Choice.Description>
											</Choice.Content>
										</Choice.Root>
									</Field.Control>
									<Field.Errors messages={toErrorMessages(field.state.meta.errors)} />
								</Field.Item>
							)}
						</form.Field>
						<AlertDialog.Footer>
							<AlertDialog.Cancel type="button">Cancel</AlertDialog.Cancel>
							<AlertDialog.Action type="submit">Release domain</AlertDialog.Action>
						</AlertDialog.Footer>
					</form>
				</AlertDialog.Body>
			</AlertDialog.Content>
		</AlertDialog.Root>
	);
}
