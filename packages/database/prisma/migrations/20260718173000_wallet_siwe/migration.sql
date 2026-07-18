CREATE TABLE "WalletAddress" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "chainId" INTEGER NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WalletAddress_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "WalletAddress_address_chainId_key" ON "WalletAddress"("address", "chainId");
CREATE INDEX "WalletAddress_userId_idx" ON "WalletAddress"("userId");

ALTER TABLE "WalletAddress" ADD CONSTRAINT "WalletAddress_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
