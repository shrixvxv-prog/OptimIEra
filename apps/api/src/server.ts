import { createServer } from 'node:http';
import { databaseHealth } from '@optimiera/database';
const port = Number(process.env.PORT ?? 4000);
const server = createServer((request, response) => {
  response.setHeader('content-type', 'application/json');
  if (request.url === '/health') {
    response.end(JSON.stringify({ status: 'ok', phase: '1' }));
    return;
  }
  if (request.url === '/ready') {
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
  if (request.url === '/version') {
    response.end(JSON.stringify({ name: 'OptimIEra API', version: '0.1.0' }));
    return;
  }
  response.statusCode = 404;
  response.end(JSON.stringify({ error: 'not_found' }));
});
server.listen(port, () => console.log(`OptimIEra API listening on ${port}`));
