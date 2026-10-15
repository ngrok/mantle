import { CursorPagination } from "@ngrok/mantle";

export const PageSizeSelect = () => (
	<CursorPagination.Root defaultPageSize={100}>
		<CursorPagination.PageSizeSelect />
		<CursorPagination.Buttons hasNextPage hasPreviousPage />
	</CursorPagination.Root>
);

export const PageSizeValue = () => (
	<CursorPagination.Root defaultPageSize={50}>
		<CursorPagination.PageSizeValue />
		<CursorPagination.Buttons hasNextPage hasPreviousPage />
	</CursorPagination.Root>
);

export const FirstPage = () => (
	<CursorPagination.Root defaultPageSize={20}>
		<CursorPagination.PageSizeSelect />
		<CursorPagination.Buttons hasNextPage hasPreviousPage={false} />
	</CursorPagination.Root>
);
