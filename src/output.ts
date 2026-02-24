import chalk from 'chalk';
import Table from 'cli-table3';
import ora, { Ora } from 'ora';

const IS_TTY = process.stdout.isTTY ?? false;

/** Print a formatted table to stdout */
export function table(headers: string[], rows: string[][]): void {
  const t = new Table({
    head: IS_TTY ? headers.map((h) => chalk.bold.cyan(h)) : headers,
    style: IS_TTY ? { head: [], border: [] } : { head: [], border: [] },
    wordWrap: true,
  });
  for (const row of rows) {
    t.push(row);
  }
  console.log(t.toString());
}

/** Print raw JSON to stdout — always machine-readable */
export function json(data: unknown): void {
  console.log(JSON.stringify(data, null, 2));
}

/** Print a green success message */
export function success(msg: string): void {
  if (IS_TTY) {
    console.log(chalk.green(`✓ ${msg}`));
  } else {
    console.log(`✓ ${msg}`);
  }
}

/** Print a red error message and exit */
export function error(msg: string, exitCode = 1): void {
  if (IS_TTY) {
    console.error(chalk.red(`✗ ${msg}`));
  } else {
    console.error(`✗ ${msg}`);
  }
  process.exit(exitCode);
}

/** Print an error as JSON to stdout (for --json mode) and exit */
export function jsonError(
  code: string,
  message: string,
  status: number,
  exitCode = 1
): void {
  console.log(
    JSON.stringify({ error: { code, message, status } }, null, 2)
  );
  process.exit(exitCode);
}

/** Print a dim info message */
export function info(msg: string): void {
  if (IS_TTY) {
    console.log(chalk.dim(msg));
  } else {
    console.log(msg);
  }
}

/** Print a warning in yellow */
export function warn(msg: string): void {
  if (IS_TTY) {
    console.log(chalk.yellow(`⚠ ${msg}`));
  } else {
    console.log(`⚠ ${msg}`);
  }
}

/** Create a spinner — returns a no-op if not a TTY */
export function spinner(text: string): Ora {
  if (!IS_TTY) {
    // Return a silent spinner that does nothing when piped
    return ora({ text, isEnabled: false });
  }
  return ora(text).start();
}
