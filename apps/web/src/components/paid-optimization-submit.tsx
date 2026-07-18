'use client';

import { useState } from 'react';

type PaymentEthereumProvider = {
  request(args: { method: string; params?: unknown[] }): Promise<unknown>;
};

export function PaidOptimizationSubmit(props: {
  enabled: boolean;
  recipient?: string;
  amountWei: string;
  chainId: number;
}) {
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(event: React.MouseEvent<HTMLButtonElement>) {
    const form = event.currentTarget.closest('form');
    if (!form) return;
    if (!props.enabled) {
      form.requestSubmit();
      return;
    }
    setBusy(true);
    setStatus('Connect your wallet and confirm 0.0001 0G on Galileo testnet.');
    try {
      const wallet = (window as unknown as { ethereum?: PaymentEthereumProvider }).ethereum;
      if (!wallet || !props.recipient) throw new Error('A compatible wallet is required.');
      const expectedChain = `0x${props.chainId.toString(16)}`;
      const currentChain = String(await wallet.request({ method: 'eth_chainId' }));
      if (currentChain.toLowerCase() !== expectedChain.toLowerCase()) {
        try {
          await wallet.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: expectedChain }],
          });
        } catch {
          await wallet.request({
            method: 'wallet_addEthereumChain',
            params: [
              {
                chainId: expectedChain,
                chainName: '0G Galileo Testnet',
                nativeCurrency: { name: '0G', symbol: '0G', decimals: 18 },
                rpcUrls: ['https://evmrpc-testnet.0g.ai'],
                blockExplorerUrls: ['https://chainscan-galileo.0g.ai'],
              },
            ],
          });
        }
      }
      const accounts = (await wallet.request({ method: 'eth_requestAccounts' })) as string[];
      if (!accounts[0]) throw new Error('No wallet account was selected.');
      const txHash = String(
        await wallet.request({
          method: 'eth_sendTransaction',
          params: [
            {
              from: accounts[0],
              to: props.recipient,
              value: `0x${BigInt(props.amountWei).toString(16)}`,
            },
          ],
        }),
      );
      const paymentInput = form.elements.namedItem('paymentTxHash') as HTMLInputElement | null;
      if (!paymentInput) throw new Error('Payment field is unavailable.');
      paymentInput.value = txHash;
      setStatus('Payment submitted. Verifying and running prompt intelligence…');
      form.requestSubmit();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Payment could not be completed.');
      setBusy(false);
    }
  }

  return (
    <div className="stack span-2">
      <button className="button primary" type="button" onClick={submit} disabled={busy}>
        {busy ? 'Verifying payment…' : 'Run optimization'}
      </button>
      <p className="muted">
        Each optimization costs 0.0001 0G on Galileo testnet when usage payments are enabled.
      </p>
      {status && <p role="status">{status}</p>}
    </div>
  );
}
