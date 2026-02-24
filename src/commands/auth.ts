import { Command } from 'commander';
import inquirer from 'inquirer';
import { IntercomClient } from '../client';
import {
  writeConfig,
  deleteConfig,
  resolveToken,
  readConfig,
} from '../config';
import {
  success,
  error,
  json as printJson,
  table,
  info,
  jsonError,
} from '../output';
import { mockAdmins } from '../mock';

const IS_TTY = process.stdout.isTTY ?? false;

export function registerAuthCommands(program: Command): void {
  const auth = program
    .command('auth')
    .description('Manage Intercom authentication');

  // --- intercom auth login ---
  auth
    .command('login')
    .description('Authenticate with your Intercom API token')
    .option(
      '--token <token>',
      'API token (skips interactive prompt)'
    )
    .option(
      '--region <region>',
      'API region: us, eu, or au',
      'us'
    )
    .option('--demo', 'Use demo mode with mock data')
    .action(async (opts) => {
      if (opts.demo) {
        const me = mockAdmins.me;
        success(`Logged in as ${me.name} (workspace: ${me.app.name})`);
        info('(demo mode — no credentials saved)');
        return;
      }

      let token: string = opts.token;
      const region: 'us' | 'eu' | 'au' = opts.region;

      if (!['us', 'eu', 'au'].includes(region)) {
        error(`Invalid region "${region}". Must be one of: us, eu, au`);
      }

      if (!token) {
        if (!IS_TTY) {
          error(
            'No token provided. Use --token <token> or set INTERCOM_TOKEN env var in non-interactive mode.'
          );
        }
        const answers = await inquirer.prompt([
          {
            type: 'password',
            name: 'token',
            message: 'Paste your Intercom API Access Token:',
            mask: '*',
            validate: (input: string) =>
              input.length > 0 || 'Token cannot be empty',
          },
        ]);
        token = answers.token;
      }

      // Validate the token by calling GET /me
      const client = new IntercomClient(token, region);
      const me = await client.get('/me');

      const adminName = me.name || me.email || 'Unknown';
      const workspace = me.app?.name || 'Unknown';
      const appId = me.app?.id_code || me.app?.id || '';

      writeConfig({
        token,
        workspace,
        app_id: String(appId),
        region,
      });

      success(`Logged in as ${adminName} (workspace: ${workspace})`);
    });

  // --- intercom auth logout ---
  auth
    .command('logout')
    .description('Remove stored Intercom credentials')
    .option('--demo', 'Use demo mode with mock data')
    .action((opts) => {
      if (opts.demo) {
        success('Logged out');
        info('(demo mode — nothing to delete)');
        return;
      }
      deleteConfig();
      success('Logged out');
    });

  // --- intercom auth whoami ---
  auth
    .command('whoami')
    .description('Display the currently authenticated admin')
    .option('--json', 'Output as JSON')
    .option('--demo', 'Use demo mode with mock data')
    .action(async (opts) => {
      if (opts.demo) {
        const me = mockAdmins.me;
        if (opts.json) {
          printJson({
            id: String(me.id),
            name: me.name,
            email: me.email,
            workspace: me.app.name,
            app_id: me.app.id_code,
            region: 'us',
          });
          return;
        }
        table(
          ['Field', 'Value'],
          [
            ['Name', me.name],
            ['Email', me.email],
            ['Workspace', me.app.name],
            ['App ID', me.app.id_code],
            ['Region', 'us'],
          ]
        );
        return;
      }

      const resolved = resolveToken();
      if (!resolved) {
        if (opts.json) {
          jsonError(
            'AUTH_REQUIRED',
            "Not authenticated. Run 'intercom auth login' or set INTERCOM_TOKEN.",
            401,
            2
          );
        }
        error(
          "Not authenticated. Run 'intercom auth login' or set INTERCOM_TOKEN.",
          2
        );
      }

      const client = new IntercomClient(resolved!.token, resolved!.region);
      const me = await client.get('/me');
      const config = readConfig();

      if (opts.json) {
        printJson({
          id: String(me.id),
          name: me.name,
          email: me.email,
          workspace: me.app?.name || config?.workspace || '',
          app_id: String(me.app?.id_code || me.app?.id || config?.app_id || ''),
          region: resolved!.region,
        });
        return;
      }

      table(
        ['Field', 'Value'],
        [
          ['Name', me.name || '—'],
          ['Email', me.email || '—'],
          ['Workspace', me.app?.name || config?.workspace || '—'],
          ['App ID', String(me.app?.id_code || me.app?.id || config?.app_id || '—')],
          ['Region', resolved!.region],
        ]
      );
    });
}
