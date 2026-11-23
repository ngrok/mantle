import type { Command } from "@ngrok/mantle/command";

export type Part = typeof Command.Item;
export const itemSelector = "[data-slot~=command-item]";
