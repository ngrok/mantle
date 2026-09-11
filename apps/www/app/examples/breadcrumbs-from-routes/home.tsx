import { redirect } from "react-router";
import { demoPaths } from "./paths";

/** The demo has no home page; its index sends the reader to the first list. */
export const loader = () => redirect(demoPaths.endpoints);
