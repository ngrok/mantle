import { Button } from "@ngrok/mantle/button";
import { Field, toErrorMessages } from "@ngrok/mantle/field";
import { Input, InputCapture } from "@ngrok/mantle/input";
import { InfoIcon } from "@phosphor-icons/react/dist/ssr/Info";
import { MagnifyingGlassIcon } from "@phosphor-icons/react/dist/ssr/MagnifyingGlass";
import { useForm } from "@tanstack/react-form";
import { z } from "zod";

import { PreviewCanvas } from "~/components/preview-canvas";

export const formSchema = z.object({
	email: z.email("Enter a valid email address."),
});

export function TanStackFormExample() {
	const defaultValues = {
		email: "",
	};
	const form = useForm({
		defaultValues,
		validators: {
			onSubmit: formSchema,
		},
		onSubmit: ({ value }) => {
			window.alert(`Submitted: ${JSON.stringify(value, null, 2)}`);
		},
	});

	return (
		<form
			className="w-full max-w-sm space-y-4"
			onSubmit={(event) => {
				event.preventDefault();
				event.stopPropagation();
				void form.handleSubmit();
			}}
		>
			<form.Field name="email">
				{(field) => (
					<Field.Item name={field.name}>
						<Field.Label>Email</Field.Label>
						<Field.Control>
							<Input
								type="email"
								value={field.state.value}
								onBlur={field.handleBlur}
								onChange={(event) => field.handleChange(event.target.value)}
								placeholder="you@example.com"
							/>
						</Field.Control>
						<Field.Errors messages={toErrorMessages(field.state.meta.errors)} />
					</Field.Item>
				)}
			</form.Field>
			<Button type="submit" appearance="filled" intent="neutral">
				Submit
			</Button>
		</form>
	);
}

/** The first example on the Input docs page. */
export function OverviewExample() {
	return (
		<PreviewCanvas className="flex flex-col gap-6">
			<Field.Item className="max-w-80" name="username">
				<Field.Label>Username</Field.Label>
				<Field.Control>
					<Input placeholder="Enter a username" />
				</Field.Control>
			</Field.Item>
			<Field.Item className="max-w-80" name="email">
				<Field.Label>Email</Field.Label>
				<Field.Control>
					<Input placeholder="Enter your email" autoComplete="email" />
				</Field.Control>
			</Field.Item>
		</PreviewCanvas>
	);
}

/** The "Validation" example on the Input docs page. */
export function ValidationExample() {
	return (
		<PreviewCanvas className="flex flex-col gap-6">
			<Field.Item className="max-w-80" name="error">
				<Field.Label>Error</Field.Label>
				<Field.Control>
					<Input placeholder={'validation="error"'} validation="error" />
				</Field.Control>
			</Field.Item>
			<Field.Item className="max-w-80" name="success">
				<Field.Label>Success</Field.Label>
				<Field.Control>
					<Input placeholder={'validation="success"'} validation="success" />
				</Field.Control>
			</Field.Item>
			<Field.Item className="max-w-80" name="warning">
				<Field.Label>Warning</Field.Label>
				<Field.Control>
					<Input placeholder={'validation="warning"'} validation="warning" />
				</Field.Control>
			</Field.Item>
		</PreviewCanvas>
	);
}

/** The "Without a Field" example on the Input docs page. */
export function WithoutAFieldExample() {
	return (
		<PreviewCanvas>
			<Input className="max-w-80" placeholder="Enter a username" />
		</PreviewCanvas>
	);
}

/** The "With TanStack Form" example on the Input docs page. */
export function WithTanstackFormExample() {
	return (
		<PreviewCanvas className="w-full">
			<TanStackFormExample />
		</PreviewCanvas>
	);
}

/** The "Child elements" example on the Input docs page. */
export function ChildElementsExample() {
	return (
		<PreviewCanvas className="grid grid-cols-2 place-items-center gap-6">
			<Field.Item className="max-w-80" name="search-start">
				<Field.Label>Search with start icon</Field.Label>
				<Field.Control>
					<Input className="max-w-64" placeholder="Search...">
						<MagnifyingGlassIcon />
						<InputCapture />
					</Input>
				</Field.Control>
			</Field.Item>
			<Field.Item className="max-w-80" name="search-end">
				<Field.Label>Search with end icon</Field.Label>
				<Field.Control>
					<Input className="max-w-64" placeholder="Search...">
						<InputCapture />
						<InfoIcon />
					</Input>
				</Field.Control>
			</Field.Item>
			<Field.Item className="max-w-80" name="search-both">
				<Field.Label>Search with start and end icons</Field.Label>
				<Field.Control>
					<Input className="max-w-64" placeholder="Search...">
						<MagnifyingGlassIcon />
						<InputCapture />
						<InfoIcon />
					</Input>
				</Field.Control>
			</Field.Item>
			<Field.Item className="max-w-80" name="search-start-error">
				<Field.Label>Search with start icon (error)</Field.Label>
				<Field.Control>
					<Input className="max-w-64" placeholder="Search..." validation="error">
						<MagnifyingGlassIcon />
						<InputCapture />
					</Input>
				</Field.Control>
			</Field.Item>
			<Field.Item className="max-w-80" name="search-end-error">
				<Field.Label>Search with end icon (error)</Field.Label>
				<Field.Control>
					<Input className="max-w-64" placeholder="Search..." validation="error">
						<InputCapture />
						<InfoIcon />
					</Input>
				</Field.Control>
			</Field.Item>
			<Field.Item className="max-w-80" name="search-both-error">
				<Field.Label>Search with start and end icons (error)</Field.Label>
				<Field.Control>
					<Input className="max-w-64" validation="error" placeholder="Search...">
						<MagnifyingGlassIcon />
						<InputCapture />
						<InfoIcon />
					</Input>
				</Field.Control>
			</Field.Item>
		</PreviewCanvas>
	);
}
