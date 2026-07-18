'use client';

import { useState } from 'react';

type EthereumProvider = {
  request(args: { method: string; params?: unknown[] }): Promise<unknown>;
  providers?: EthereumProvider[];
  isMetaMask?: boolean;
  isRabby?: boolean;
  isOkxWallet?: boolean;
};

declare global {
  interface Window {
    ethereum?: EthereumProvider;
    okxwallet?: EthereumProvider;
  }
}

type WalletKind = 'MetaMask' | 'Rabby' | 'OKX Wallet' | 'Browser wallet';

function walletProvider(kind: WalletKind) {
  const injected = window.ethereum;
  const providers = injected?.providers?.length ? injected.providers : injected ? [injected] : [];
  if (kind === 'OKX Wallet')
    return window.okxwallet ?? providers.find((provider) => provider.isOkxWallet);
  if (kind === 'Rabby') return providers.find((provider) => provider.isRabby);
  if (kind === 'MetaMask')
    return providers.find((provider) => provider.isMetaMask && !provider.isRabby);
  return injected;
}

function buildSiweMessage(address: string, chainId: number, nonce: string) {
  const origin = window.location.origin;
  return `${window.location.host} wants you to sign in with your Ethereum account:\n${address}\n\nSign in to OptimIEra\n\nURI: ${origin}\nVersion: 1\nChain ID: ${chainId}\nNonce: ${nonce}\nIssued At: ${new Date().toISOString()}`;
}

export function WalletAuthButton({ mode }: { mode: 'sign-in' | 'sign-up' }) {
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function connectWallet(kind: WalletKind) {
    setError('');
    setLoading(true);
    try {
      const provider = walletProvider(kind);
      if (!provider) {
        throw new Error(`${kind} was not detected. Install or unlock the wallet and try again.`);
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
      <div className="button-row" aria-label="Wallet options">
        {(['MetaMask', 'Rabby', 'OKX Wallet', 'Browser wallet'] as const).map((kind) => (
          <button
            className="button"
            type="button"
            onClick={() => connectWallet(kind)}
            disabled={loading}
            key={kind}
          >
            {loading
              ? 'Waiting for wallet…'
              : `${mode === 'sign-up' ? 'Create account' : 'Sign in'} with ${kind}`}
          </button>
        ))}
      </div>
      <p className="muted">
        Works with MetaMask, Rabby, OKX Wallet, and other injected EIP-1193 wallets.
      </p>
      {error && <p role="alert">{error}</p>}
    </div>
  );
}
