import { cx } from "@ngrok/mantle/cx";
import { DataTable } from "@ngrok/mantle/data-table";
import { Table as MantleTable } from "@ngrok/mantle/table";
import { Table } from "another-library";

function Example({ note, mode }: { note: string; mode: string }) {
	return (
		<MantleTable.Root>
			<MantleTable.Element>
				<MantleTable.Body>
					<MantleTable.Row>
						<MantleTable.Header className="whitespace-normal" width="wrap">
							Notes
						</MantleTable.Header>
						<MantleTable.Cell className="text-sm whitespace-normal" width="wrap">
							{note}
						</MantleTable.Cell>
						<MantleTable.Cell className={cx("font-sans", "break-words")} width="wrap">
							{note}
						</MantleTable.Cell>
						<MantleTable.Cell className="md:line-clamp-2" width="wrap" />
						{/* Left for a person: a comparison, a class that does not wrap, and a set width. */}
						<MantleTable.Cell className={cx(mode === "whitespace-normal" && "font-sans")}>
							{note}
						</MantleTable.Cell>
						<MantleTable.Cell className="whitespace-nowrap">{note}</MantleTable.Cell>
						<MantleTable.Cell className="whitespace-normal" width="fit">
							{note}
						</MantleTable.Cell>
						{/* Not a header or a cell: unchanged. */}
						<MantleTable.Row className="whitespace-normal" />
						<td className="whitespace-normal">{note}</td>
						<Table.Cell className="whitespace-normal">{note}</Table.Cell>
					</MantleTable.Row>
				</MantleTable.Body>
			</MantleTable.Element>
		</MantleTable.Root>
	);
}

const cell = (value: string) => (
	<DataTable.Cell className="whitespace-pre-wrap" width="wrap">
		{value}
	</DataTable.Cell>
);

function Shadowed({ DataTable }: { DataTable: { Cell: (props: { className: string }) => null } }) {
	return <DataTable.Cell className="whitespace-normal" />;
}

export {
	//,
	cell,
	Example,
	Shadowed,
};
