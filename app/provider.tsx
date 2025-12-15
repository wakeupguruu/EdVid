'use client';
import React from 'react';
import { SessionProvider } from 'next-auth/react';
import { ThemeProvider as NextThemesProvider } from "next-themes";

export const Providers = ({ children }: { children: React.ReactNode }) => {
  return (
    <SessionProvider>
      <NextThemesProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange
      >
        {children}
      </NextThemesProvider>
    </SessionProvider>
  );
};