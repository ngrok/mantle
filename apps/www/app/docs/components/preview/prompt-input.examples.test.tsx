// @vitest-environment happy-dom
import { fireEvent, render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { expect, test } from "vitest";
import { AttachExample } from "~/docs/components/preview/prompt-input.examples";

test("each repeated file can be removed without changing the other attachments", async () => {
	const user = userEvent.setup();
	render(<AttachExample />);
	const field = screen.getByRole("textbox", { name: "Message the assistant" });
	const report = new File(["report"], "report.txt", { lastModified: 1 });
	const other = new File(["other"], "other.txt", { lastModified: 2 });
	for (const file of [report, other, report]) {
		fireEvent.drop(field, { dataTransfer: { files: [file] } });
	}

	const firstRemove = screen.getAllByRole("button", { name: "Remove report.txt" })[0];
	if (firstRemove == null) {
		throw new Error("The report has no remove button.");
	}
	await user.click(firstRemove);
	expect(screen.getAllByRole("button", { name: "Remove report.txt" })).toHaveLength(1);
	await user.click(screen.getByRole("button", { name: "Remove report.txt" }));
	expect(screen.queryByRole("button", { name: "Remove report.txt" })).toBeNull();
	expect(screen.queryByRole("button", { name: "Remove other.txt" })).not.toBeNull();
});
