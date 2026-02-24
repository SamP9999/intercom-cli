import { Command } from 'commander';
import { IntercomClient } from '../client';
import { resolveToken } from '../config';
import {
  table,
  json as printJson,
  error,
  info,
  spinner,
  jsonError,
} from '../output';
import { mockTeams } from '../mock';

function getClient(opts: { json?: boolean }): IntercomClient {
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
    process.exit(2);
  }
  return new IntercomClient(resolved.token, resolved.region);
}

export function registerTeamCommands(program: Command): void {
  const teams = program
    .command('teams')
    .description('List Intercom teams');

  // --- list ---
  teams
    .command('list')
    .description('List all teams in the workspace')
    .option('--json', 'Output as JSON')
    .option('--demo', 'Use demo mode with mock data')
    .action(async (opts) => {
      if (opts.demo) {
        if (opts.json) {
          printJson({
            data: mockTeams.map((t) => ({ ...t, id: String(t.id) })),
            total: mockTeams.length,
          });
          return;
        }
        const rows = mockTeams.map((t) => [
          String(t.id),
          t.name,
          String(t.admin_ids.length),
        ]);
        table(['ID', 'Name', 'Admin Count'], rows);
        return;
      }

      const client = getClient(opts);
      const spin = spinner('Fetching teams...');

      const response = await client.get('/teams');
      const teamsList = response.teams || response.data || [];

      spin.stop();

      if (opts.json) {
        printJson({
          data: teamsList.map((t: any) => ({ ...t, id: String(t.id) })),
          total: teamsList.length,
        });
        return;
      }

      if (teamsList.length === 0) {
        info('No teams found.');
        return;
      }

      const rows = teamsList.map((t: any) => [
        String(t.id),
        t.name || '—',
        String(t.admin_ids?.length ?? 0),
      ]);

      table(['ID', 'Name', 'Admin Count'], rows);
    });
}
