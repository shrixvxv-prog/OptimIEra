export type LogContext = Readonly<Record<string, string | number | boolean | undefined>>;
export function log(
  level: 'info' | 'warn' | 'error',
  message: string,
  context: LogContext = {},
): void {
  const safe = Object.fromEntries(
    Object.entries(context).filter(([key]) => !/secret|token|key|prompt/i.test(key)),
  );
  console[level](JSON.stringify({ level, message, ...safe }));
}
