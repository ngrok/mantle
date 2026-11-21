/**
 * The parts of the `Command` namespace. `index.ts` imports them as one module
 * namespace, so a bundler keeps only the parts a consumer reads.
 */

export {
	//,
	CommandRoot as Root,
	CommandDialogRoot as DialogRoot,
	CommandSearchTrigger as SearchTrigger,
	DialogTrigger,
	CommandDialogContent as DialogContent,
	CommandInput as Input,
	CommandList as List,
	CommandEmpty as Empty,
	CommandGroup as Group,
	CommandItem as Item,
	CommandShortcut as Shortcut,
	CommandSeparator as Separator,
} from "./command.js";
