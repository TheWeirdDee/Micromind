'use client';

import React, { createContext, useContext, ReactNode, useMemo } from 'react';
import { http, createConfig, WagmiProvider } from 'wagmi';
import { celo } from 'wagmi/chains';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const config = createConfig({
  chains: [celo],
  transports: {
    [celo.id]: http(),
  },
});

const queryClient = new QueryClient();

export function WalletProvider({ children }: { children: ReactNode }) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </WagmiProvider>
  );
}
