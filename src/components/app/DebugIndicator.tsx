'use client';

import { useWallet } from '@/context/WalletContext';

export function DebugIndicator() {
  const { isConnected, address } = useWallet();

  if (process.env.NODE_ENV !== 'development') return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      background: 'red',
      color: 'white',
      fontSize: '10px',
      padding: '2px 4px',
      zIndex: 9999
    }}>
      {isConnected ? `Connected: ${address?.slice(0,8)}` : 'DISCONNECTED'}
    </div>
  );
}
