import type { PropsWithChildren } from "react";
import { createContext, useContext, useMemo, useState } from "react";
import { useLocation } from "react-router";

type NavigationContextType = {
	showNavigation: boolean;
	setShowNavigation: (value: boolean) => void;
};

const NavigationContext = createContext<NavigationContextType | undefined>(undefined);

/**
 * Holds the open state of the mobile drawer. The drawer is open only at the
 * location where the user opened it, so each navigation closes it: a link in
 * the drawer, the header logo, the command palette, or the back button.
 */
export const NavigationProvider = ({ children }: PropsWithChildren) => {
	const { key } = useLocation();
	const [openedAtKey, setOpenedAtKey] = useState<string>();
	const showNavigation = openedAtKey === key;
	// Why: without this, the forward button opens the drawer again when it
	// returns to the location where the user opened it.
	if (openedAtKey != null && !showNavigation) {
		setOpenedAtKey(undefined);
	}
	const contextValue = useMemo(
		() => ({
			showNavigation,
			setShowNavigation: (value: boolean) => {
				setOpenedAtKey(value ? key : undefined);
			},
		}),
		[showNavigation, key],
	);

	return <NavigationContext.Provider value={contextValue}>{children}</NavigationContext.Provider>;
};

export const useNavigation = () => {
	const context = useContext(NavigationContext);
	if (!context) {
		throw new Error("useNavigation must be used within a NavigationProvider");
	}
	return context;
};
