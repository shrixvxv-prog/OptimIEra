import { createServer, IncomingMessage, ServerResponse } from 'node:http';
import { databaseHealth } from '@optimiera/database';

export function handleRequest(request: IncomingMessage, response: ServerResponse) {
  response.setHeader('content-type', 'application/json');

  // Normalize URL path to handle routing consistently
  const url = request.url ? new URL(request.url, 'http://localhost').pathname : '/';

  if (url === '/health' || url === '/api/health') {
    response.end(JSON.stringify({ status: 'ok', phase: '1' }));
    return;
  }
  if (url === '/ready' || url === '/api/ready') {
    void databaseHealth().then((database) => {
      const auth = Boolean(process.env.AUTH_SECRET || process.env.BETTER_AUTH_SECRET);
      const ready = database.status === 'ok' && auth;
      response.statusCode = ready ? 200 : 503;
      response.end(
        JSON.stringify({
          status: ready ? 'ready' : 'not-ready',
          application: 'ok',
          database,
          authentication: auth ? 'configured' : 'missing',
          externalIntegrations: 'unconfigured',
        }),
      );
    });
    return;
  }
  if (url === '/version' || url === '/api/version') {
    response.end(JSON.stringify({ name: 'OptimIEra API', version: '0.1.0' }));
    return;
  }
  response.statusCode = 404;
  response.end(JSON.stringify({ error: 'not_found' }));
}

const server = createServer(handleRequest);

if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
  const port = Number(process.env.PORT ?? 4000);
  server.listen(port, () => console.log(`OptimIEra API listening on ${port}`));
}

export default handleRequest;
