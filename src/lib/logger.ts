// Minimal timestamped console logger.
function ts(): string {
  return new Date().toISOString();
}

export const logger = {
  info(msg: string, ...rest: unknown[]): void {
    // eslint-disable-next-line no-console
    console.log(`[${ts()}] INFO  ${msg}`, ...rest);
  },
  warn(msg: string, ...rest: unknown[]): void {
    // eslint-disable-next-line no-console
    console.warn(`[${ts()}] WARN  ${msg}`, ...rest);
  },
  error(msg: string, ...rest: unknown[]): void {
    // eslint-disable-next-line no-console
    console.error(`[${ts()}] ERROR ${msg}`, ...rest);
  },
};
