// oxlint-disable typescript/consistent-type-imports -- the codemod writes a value import, and the consumer's linter fixes it
import { RadioGroup, RadioGroup as MantleRadioGroup } from "@ngrok/mantle/radio-group";
import type { ComponentProps } from "react";

// Only the second binding of the import reads the removed parts.
export type ViewProps = ComponentProps<typeof MantleRadioGroup.ButtonGroup>;
export type SegmentProps = ComponentProps<typeof MantleRadioGroup.Button>;

// Parts that stay.
export type RadioProps = ComponentProps<typeof RadioGroup.Item>;
export type GroupProps = ComponentProps<typeof MantleRadioGroup.Root>;
