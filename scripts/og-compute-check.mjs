import 'dotenv/config';
const network = process.env.OG_COMPUTE_NETWORK === 'mainnet' ? 'mainnet' : 'testnet';
const baseUrl =
  process.env.OG_COMPUTE_BASE_URL ||
  (network === 'mainnet'
    ? 'https://router-api.0g.ai/v1'
    : 'https://router-api-testnet.integratenetwork.work/v1');
const model = process.env.OG_COMPUTE_MODEL || '';
const apiKey = process.env.OG_COMPUTE_API_KEY || '';
const result = {
  network,
  endpointHost: new URL(baseUrl).host,
  model: model || '(unset)',
  modelDiscovery: 'not attempted',
  inference: apiKey ? 'not attempted' : 'skipped: API key unset',
  requestId: undefined,
  latencyMs: undefined,
  errorCode: undefined,
};
const started = Date.now();
try {
  const modelsResponse = await fetch(`${baseUrl}/models`);
  const models = await modelsResponse.json().catch(() => null);
  result.modelDiscovery =
    modelsResponse.ok && Array.isArray(models?.data)
      ? model && models.data.some((item) => item.id === model)
        ? 'configured model found'
        : model
          ? 'configured model missing'
          : 'catalog available'
      : 'failed';
  if (!modelsResponse.ok) result.errorCode = String(modelsResponse.status);
  if (apiKey && model && result.modelDiscovery === 'configured model found') {
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model,
        max_tokens: 10,
        messages: [{ role: 'user', content: 'Return JSON: {"ok":true}' }],
      }),
    });
    const body = await response.json().catch(() => null);
    result.inference = response.ok ? 'success' : 'failed';
    result.requestId = response.headers.get('x-request-id') || body?.request_id;
    if (!response.ok) result.errorCode = String(response.status);
  }
} catch {
  result.errorCode = 'NETWORK_OR_TIMEOUT';
  result.modelDiscovery = 'failed';
}
result.latencyMs = Date.now() - started;
console.log(JSON.stringify(result, null, 2));
