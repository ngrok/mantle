import type { PropsWithChildren } from "react";
import { createContext, useContext, useMemo, useState } from "react";

type NavigationContextType = {
	showNavigation: boolean;
	setShowNavigation: (value: boolean) => void;
};

const NavigationContext = createContext<NavigationContextType | undefined>(undefined);

export const NavigationProvider = ({ children }: PropsWithChildren) => {
	const [showNavigation, setShowNavigation] = useState(false);
	const contextValue = useMemo(() => ({ showNavigation, setShowNavigation }), [showNavigation]);

	return <NavigationContext.Provider value={contextValue}>{children}</NavigationContext.Provider>;
};

export const useNavigation = () => {
	const context = useContext(NavigationContext);
	if (!context) {
		throw new Error("useNavigation must be used within a NavigationProvider");
	}
	return context;
};
