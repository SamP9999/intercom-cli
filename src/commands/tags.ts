import { Command } from 'commander';
import { IntercomClient } from '../client';
import { resolveToken } from '../config';
import {
  table,
  json as printJson,
  success,
  error,
  spinner,
  jsonError,
} from '../output';
import { mockTags } from '../mock';

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

export function registerTagCommands(program: Command): void {
  const tags = program
    .command('tags')
    .description('Manage Intercom tags');

  // --- list ---
  tags
    .command('list')
    .description('List all tags in the workspace')
    .option('--json', 'Output as JSON')
    .option('--demo', 'Use demo mode with mock data')
    .action(async (opts) => {
      if (opts.demo) {
        if (opts.json) {
          printJson({
            data: mockTags.map((t) => ({ ...t, id: String(t.id) })),
            total: mockTags.length,
          });
          return;
        }
        const rows = mockTags.map((t) => [String(t.id), t.name]);
        table(['ID', 'Name'], rows);
        return;
      }

      const client = getClient(opts);
      const spin = spinner('Fetching tags...');

      const response = await client.get('/tags');
      const tagsList = response.data || [];

      spin.stop();

      if (opts.json) {
        printJson({
          data: tagsList.map((t: any) => ({ ...t, id: String(t.id) })),
          total: tagsList.length,
        });
        return;
      }

      if (tagsList.length === 0) {
        console.log('No tags found.');
        return;
      }

      const rows = tagsList.map((t: any) => [String(t.id), t.name]);
      table(['ID', 'Name'], rows);
    });

  // --- create ---
  tags
    .command('create')
    .description('Create a new tag')
    .requiredOption('--name <name>', 'Tag name')
    .option('--json', 'Output as JSON')
    .option('--demo', 'Use demo mode with mock data')
    .action(async (opts) => {
      if (opts.demo) {
        const newTag = {
          type: 'tag',
          id: '8390299',
          name: opts.name,
        };
        if (opts.json) {
          printJson({ ...newTag, id: String(newTag.id) });
          return;
        }
        success(`Tag "${opts.name}" created with ID ${newTag.id}.`);
        return;
      }

      const client = getClient(opts);
      const spin = spinner(`Creating tag "${opts.name}"...`);

      const tag = await client.post('/tags', { name: opts.name });
      spin.stop();

      if (opts.json) {
        printJson({ ...tag, id: String(tag.id) });
        return;
      }

      success(`Tag "${opts.name}" created with ID ${tag.id}.`);
    });
}
