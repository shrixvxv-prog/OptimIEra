import { readNousConfig, readOGComputeConfig } from '@optimiera/config';
import { NousPromptIntelligenceProvider, OGComputeRouterProvider } from '@optimiera/og-compute';
import { readUsagePaymentConfig } from '@optimiera/payment';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

export async function GET() {
  const [og, nous] = await Promise.all([
    new OGComputeRouterProvider(readOGComputeConfig()).healthCheck(),
    new NousPromptIntelligenceProvider(readNousConfig()).healthCheck(),
  ]);
  const payment = readUsagePaymentConfig();
  return Response.json({
    rulesEngine: {
      status: 'AVAILABLE',
      mode: 'local-deterministic',
      fee: payment.enabled ? '0.0001 0G' : 'free',
    },
    ogCompute: { status: og.state, network: og.network, model: og.model ?? null },
    nous: { status: nous.state, model: nous.model ?? null },
    usagePayment: {
      enabled: payment.enabled,
      network: '0G Galileo Testnet',
      chainId: payment.chainId,
      amountWei: payment.amountWei.toString(),
      amountOG: '0.0001',
      recipientConfigured: Boolean(payment.recipient),
    },
  });
}
