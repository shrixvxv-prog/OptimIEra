export default function Security() {
  return (
    <main className="appmain">
      <div className="eyebrow">Account / Security</div>
      <h1>Security controls</h1>
      <div className="card">
        <h3>Authentication</h3>
        <p className="muted">
          Password hashing, session persistence, password reset, and email verification are provided
          by Better Auth.
        </p>
        <p className="muted">
          Wallet authentication uses SIWE with one-time nonces and supports MetaMask, Rabby, OKX
          Wallet, and other injected EIP-1193 wallets.
        </p>
      </div>
    </main>
  );
}
