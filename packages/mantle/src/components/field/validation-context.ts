"use client";

import { createContext, createElement, useContext, type ReactNode } from "react";
import type { ValidationState } from "./validation.js";

const FieldValidationContext = createContext<ValidationState | undefined>(undefined);

/**
 * Provides a resolved field validation state to Mantle controls rendered
 * inside a `Field.Item` or `Field.Control`.
 */
const FieldValidationProvider = ({
	children,
	validation,
}: {
	children?: ReactNode;
	validation?: ValidationState;
}) => createElement(FieldValidationContext.Provider, { value: validation }, children);

/**
 * Reads the nearest resolved field validation state, when a Mantle control is
 * composed inside `Field.Item` / `Field.Control`.
 */
const useFieldValidation = () => useContext(FieldValidationContext);

export {
	//,
	FieldValidationProvider,
	useFieldValidation,
};
