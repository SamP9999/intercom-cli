import { Command } from 'commander';
import dayjs from 'dayjs';
import { IntercomClient } from '../client';
import { resolveToken } from '../config';
import {
  table,
  json as printJson,
  success,
  error,
  info,
  spinner,
  jsonError,
} from '../output';
import { mockNotes } from '../mock';

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

function isoTimestamp(ts: number | null | undefined): string {
  if (!ts) return '—';
  return dayjs(ts * 1000).toISOString();
}

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .trim();
}

function preview(text: string | null | undefined, maxLen = 80): string {
  if (!text) return '—';
  const clean = stripHtml(text);
  if (clean.length <= maxLen) return clean;
  return clean.slice(0, maxLen - 1) + '…';
}

export function registerNoteCommands(program: Command): void {
  const notes = program
    .command('notes')
    .description('Manage notes on Intercom contacts');

  // --- add ---
  notes
    .command('add <contact_id>')
    .description('Add a note to a contact')
    .requiredOption('--body <text>', 'Note content')
    .option('--admin-id <id>', 'Admin ID authoring the note')
    .option('--json', 'Output as JSON')
    .option('--demo', 'Use demo mode with mock data')
    .action(async (contactId, opts) => {
      if (opts.demo) {
        const newNote = {
          type: 'note',
          id: '701099',
          body: `<p>${opts.body}</p>`,
          created_at: Math.floor(Date.now() / 1000),
          author: { type: 'admin', id: '814301', name: 'Sarah Chen' },
        };
        if (opts.json) {
          printJson({
            ...newNote,
            id: String(newNote.id),
            created_at_human: isoTimestamp(newNote.created_at),
          });
          return;
        }
        success(`Note added to contact ${contactId} (note ID: ${newNote.id}).`);
        return;
      }

      const client = getClient(opts);

      let adminId = opts.adminId;
      if (!adminId) {
        const me = await client.get('/me');
        adminId = String(me.id);
      }

      const body = {
        admin_id: adminId,
        body: opts.body,
      };

      const spin = spinner(`Adding note to contact ${contactId}...`);
      const note = await client.post(`/contacts/${contactId}/notes`, body);
      spin.stop();

      if (opts.json) {
        printJson({
          ...note,
          id: String(note.id),
          created_at_human: isoTimestamp(note.created_at),
        });
        return;
      }

      success(`Note added to contact ${contactId} (note ID: ${note.id}).`);
    });

  // --- list ---
  notes
    .command('list <contact_id>')
    .description('List notes on a contact')
    .option('--limit <n>', 'Max results', '20')
    .option('--json', 'Output as JSON')
    .option('--demo', 'Use demo mode with mock data')
    .action(async (contactId, opts) => {
      if (opts.demo) {
        const contactNotes = mockNotes[contactId] || [];
        const limit = parseInt(opts.limit, 10) || 20;
        const results = contactNotes.slice(0, limit);

        if (opts.json) {
          printJson({
            data: results.map((n: any) => ({
              ...n,
              id: String(n.id),
              created_at_human: isoTimestamp(n.created_at),
            })),
            total: results.length,
          });
          return;
        }

        if (results.length === 0) {
          info('No notes found for this contact.');
          return;
        }

        const rows = results.map((n: any) => [
          String(n.id),
          preview(n.body),
          n.author?.name || '—',
          isoTimestamp(n.created_at),
        ]);

        table(['ID', 'Body Preview', 'Author', 'Created At'], rows);
        return;
      }

      const client = getClient(opts);
      const spin = spinner(`Fetching notes for contact ${contactId}...`);
      const limit = parseInt(opts.limit, 10) || 20;

      const results = await client.paginate(
        `/contacts/${contactId}/notes`,
        {},
        'data',
        limit
      );

      spin.stop();

      if (opts.json) {
        printJson({
          data: results.map((n: any) => ({
            ...n,
            id: String(n.id),
            created_at_human: isoTimestamp(n.created_at),
          })),
          total: results.length,
        });
        return;
      }

      if (results.length === 0) {
        info('No notes found for this contact.');
        return;
      }

      const rows = results.map((n: any) => [
        String(n.id),
        preview(n.body),
        n.author?.name || n.author?.email || '—',
        isoTimestamp(n.created_at),
      ]);

      table(['ID', 'Body Preview', 'Author', 'Created At'], rows);
    });
}
