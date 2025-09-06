import React, { createContext, useContext, useState } from 'react';

type UIContextType = {
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (v: boolean) => void;
};

const UIContext = createContext<UIContextType | undefined>(undefined);

export const UIProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  return (
    <UIContext.Provider value={{ sidebarCollapsed, setSidebarCollapsed }}>
      {children}
    </UIContext.Provider>
  );
};

export const useUI = () => {
  const ctx = useContext(UIContext);
  if (!ctx) throw new Error('useUI must be used within UIProvider');
  return ctx;
};

export default UIContext;
