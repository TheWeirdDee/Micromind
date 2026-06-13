'use client';

import { useWallet } from '@/context/WalletContext';
import { useCallback } from 'react';

/**
 * useMiniPay Hook
 * Provides MiniPay-specific utilities and state.
 * Ensures the app feels native when running inside the MiniPay wallet.
 */
export function useMiniPay() {
  const { isMiniPay, address, isConnected, connect } = useWallet();

  const shareToMiniPay = useCallback((text: string, url: string) => {
    if (typeof navigator !== 'undefined' && navigator.share) {
      navigator.share({
        title: 'MicroMind AI',
        text: text,
        url: url,
      }).catch(console.error);
    } else {
      // Fallback for desktop/non-supported browsers
      const shareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
      window.open(shareUrl, '_blank');
    }
  }, []);

  const openWallet = useCallback(() => {
    if (isMiniPay) {
      // In MiniPay, this could trigger specific wallet actions if available via window.ethereum
      console.log('Already in MiniPay');
    } else {
      // Logic for deep linking into MiniPay if on mobile
      const appUrl = typeof window !== 'undefined' ? window.location.href : '';
      const deepLink = `https://minipay.page.link/?link=${encodeURIComponent(appUrl)}&apn=com.opera.mini.native`;
      window.location.href = deepLink;
    }
  }, [isMiniPay]);

  return {
    isMiniPay,
    address,
    isConnected,
    connectInMiniPay: connect,
    shareToMiniPay,
    openWallet
  };
}
