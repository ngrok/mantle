import { render } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import { Sidebar } from "./sidebar.js";

describe("Sidebar.AccountAvatar", () => {
	test("renders the first letter (uppercased) of a single-word name", () => {
		const { container } = render(<Sidebar.AccountAvatar accountId="acc_1" accountName="acme" />);
		expect(container.textContent).toBe("A");
	});

	test("renders the first letter of each word for multi-word names", () => {
		const { container } = render(
			<Sidebar.AccountAvatar accountId="acc_1" accountName="Acme Corporation" />,
		);
		expect(container.textContent).toBe("AC");
	});

	test("limits to two letters even for long multi-word names", () => {
		const { container } = render(
			<Sidebar.AccountAvatar accountId="acc_1" accountName="Acme Corporation Holdings" />,
		);
		expect(container.textContent).toBe("AC");
	});

	test("renders ? when name is empty or only special characters", () => {
		const { container: empty } = render(<Sidebar.AccountAvatar accountId="acc_1" accountName="" />);
		expect(empty.textContent).toBe("?");

		const { container: specials } = render(
			<Sidebar.AccountAvatar accountId="acc_2" accountName="!!!" />,
		);
		expect(specials.textContent).toBe("?");
	});

	test("strips special characters before computing initials", () => {
		const { container } = render(
			<Sidebar.AccountAvatar accountId="acc_1" accountName="!!!Banana***" />,
		);
		expect(container.textContent).toBe("B");
	});

	test("the same accountId always picks the same color", () => {
		const { getByTestId } = render(
			<>
				<Sidebar.AccountAvatar accountId="acc_stable" accountName="A" data-testid="first" />
				<Sidebar.AccountAvatar accountId="acc_stable" accountName="A" data-testid="second" />
			</>,
		);
		expect(getByTestId("first").className).toBe(getByTestId("second").className);
	});
});
