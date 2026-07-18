'use client';

import { useState } from 'react';

type EthereumProvider = {
  request(args: { method: string; params?: unknown[] }): Promise<unknown>;
};

declare global {
  interface Window {
    ethereum?: EthereumProvider;
  }
}

function buildSiweMessage(address: string, chainId: number, nonce: string) {
  const origin = window.location.origin;
  return `${window.location.host} wants you to sign in with your Ethereum account:\n${address}\n\nSign in to OptimIEra\n\nURI: ${origin}\nVersion: 1\nChain ID: ${chainId}\nNonce: ${nonce}\nIssued At: ${new Date().toISOString()}`;
}

export function WalletAuthButton({ mode }: { mode: 'sign-in' | 'sign-up' }) {
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function connectWallet() {
    setError('');
    setLoading(true);
    try {
      const provider = window.ethereum;
      if (!provider) {
        throw new Error('Install MetaMask, Rabby, OKX Wallet, or another compatible wallet.');
      }
      const accounts = (await provider.request({ method: 'eth_requestAccounts' })) as string[];
      const address = accounts[0];
      if (!address) throw new Error('No wallet account was selected.');
      const chainHex = (await provider.request({ method: 'eth_chainId' })) as string;
      const chainId = Number.parseInt(chainHex, 16);
      if (!Number.isInteger(chainId) || chainId <= 0) throw new Error('Wallet chain is invalid.');

      const nonceResponse = await fetch('/api/auth/siwe/nonce', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ walletAddress: address, chainId }),
      });
      const noncePayload = (await nonceResponse.json()) as { nonce?: string };
      if (!nonceResponse.ok || !noncePayload.nonce)
        throw new Error('Could not start wallet sign-in.');

      const message = buildSiweMessage(address, chainId, noncePayload.nonce);
      const signature = (await provider.request({
        method: 'personal_sign',
        params: [message, address],
      })) as string;
      const verifyResponse = await fetch('/api/auth/siwe/verify', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ message, signature, walletAddress: address, chainId }),
      });
      if (!verifyResponse.ok) throw new Error('Wallet signature verification failed.');
      window.location.assign('/app');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Wallet sign-in failed.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="stack">
      <button className="button" type="button" onClick={connectWallet} disabled={loading}>
        {loading
          ? 'Waiting for wallet…'
          : mode === 'sign-up'
            ? 'Create account with wallet'
            : 'Sign in with wallet'}
      </button>
      <p className="muted">
        Works with MetaMask, Rabby, OKX Wallet, and other injected EIP-1193 wallets.
      </p>
      {error && <p role="alert">{error}</p>}
    </div>
  );
}
