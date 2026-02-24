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
import { mockContacts, mockConversations } from '../mock';

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

function enrichContact(c: any): any {
  return {
    ...c,
    id: String(c.id),
    created_at_human: isoTimestamp(c.created_at),
    updated_at_human: isoTimestamp(c.updated_at),
    last_seen_at_human: isoTimestamp(c.last_seen_at),
  };
}

export function registerContactCommands(program: Command): void {
  const contacts = program
    .command('contacts')
    .description('Manage Intercom contacts (users and leads)');

  // --- list ---
  contacts
    .command('list')
    .description('List contacts')
    .option('--limit <n>', 'Max results (default: 20)', '20')
    .option('--json', 'Output as JSON')
    .option('--demo', 'Use demo mode with mock data')
    .action(async (opts) => {
      if (opts.demo) {
        const limit = parseInt(opts.limit, 10) || 20;
        const results = mockContacts.slice(0, limit);

        if (opts.json) {
          printJson({
            data: results.map(enrichContact),
            total: results.length,
          });
          return;
        }

        const rows = results.map((c: any) => [
          String(c.id),
          c.name || '—',
          c.email || '—',
          c.role || '—',
          isoTimestamp(c.created_at),
          isoTimestamp(c.last_seen_at),
        ]);

        table(['ID', 'Name', 'Email', 'Role', 'Created At', 'Last Seen'], rows);
        return;
      }

      const client = getClient(opts);
      const spin = spinner('Fetching contacts...');
      const limit = parseInt(opts.limit, 10) || 20;

      const results = await client.paginate('/contacts', {}, 'data', limit);
      spin.stop();

      if (opts.json) {
        printJson({
          data: results.map(enrichContact),
          total: results.length,
        });
        return;
      }

      if (results.length === 0) {
        info('No contacts found.');
        return;
      }

      const rows = results.map((c: any) => [
        String(c.id),
        c.name || '—',
        c.email || '—',
        c.role || '—',
        isoTimestamp(c.created_at),
        isoTimestamp(c.last_seen_at),
      ]);

      table(['ID', 'Name', 'Email', 'Role', 'Created At', 'Last Seen'], rows);
    });

  // --- get ---
  contacts
    .command('get <id>')
    .description('Get a contact by Intercom ID')
    .option('--json', 'Output as JSON')
    .option('--demo', 'Use demo mode with mock data')
    .action(async (id, opts) => {
      if (opts.demo) {
        const contact = mockContacts.find((c) => String(c.id) === id);
        if (!contact) {
          if (opts.json) {
            jsonError('NOT_FOUND', `Contact ${id} not found.`, 404, 3);
          }
          error(`Contact ${id} not found.`, 3);
          return;
        }
        if (opts.json) {
          printJson(enrichContact(contact));
          return;
        }
        table(
          ['Field', 'Value'],
          [
            ['ID', String(contact.id)],
            ['Name', contact.name || '—'],
            ['Email', contact.email || '—'],
            ['Phone', contact.phone || '—'],
            ['Role', contact.role || '—'],
            ['External ID', contact.external_id || '—'],
            ['Created', isoTimestamp(contact.created_at)],
            ['Last Seen', isoTimestamp(contact.last_seen_at)],
            ['City', contact.location?.city || '—'],
            ['Country', contact.location?.country || '—'],
            ['Browser', contact.browser || '—'],
            ['OS', contact.os || '—'],
          ]
        );
        return;
      }

      const client = getClient(opts);
      const spin = spinner(`Fetching contact ${id}...`);

      const contact = await client.get(`/contacts/${id}`);
      spin.stop();

      if (opts.json) {
        printJson(enrichContact(contact));
        return;
      }

      table(
        ['Field', 'Value'],
        [
          ['ID', String(contact.id)],
          ['Name', contact.name || '—'],
          ['Email', contact.email || '—'],
          ['Phone', contact.phone || '—'],
          ['Role', contact.role || '—'],
          ['External ID', contact.external_id || '—'],
          ['Created', isoTimestamp(contact.created_at)],
          ['Last Seen', isoTimestamp(contact.last_seen_at)],
          ['City', contact.location?.city || '—'],
          ['Country', contact.location?.country || '—'],
          ['Browser', contact.browser || '—'],
          ['OS', contact.os || '—'],
        ]
      );
    });

  // --- find ---
  contacts
    .command('find')
    .description('Find a contact by email or external ID')
    .option('--email <email>', 'Find by email address')
    .option('--external-id <id>', 'Find by external (your system) ID')
    .option('--json', 'Output as JSON')
    .option('--demo', 'Use demo mode with mock data')
    .action(async (opts) => {
      if (!opts.email && !opts.externalId) {
        error('Provide --email or --external-id to search.');
      }

      if (opts.demo) {
        let results = [...mockContacts];
        if (opts.email) {
          results = results.filter((c) => c.email === opts.email);
        }
        if (opts.externalId) {
          results = results.filter((c) => c.external_id === opts.externalId);
        }

        if (opts.json) {
          printJson({
            data: results.map(enrichContact),
            total: results.length,
          });
          return;
        }

        if (results.length === 0) {
          info('No contacts found.');
          return;
        }

        const rows = results.map((c: any) => [
          String(c.id),
          c.name || '—',
          c.email || '—',
          c.role || '—',
          c.external_id || '—',
          isoTimestamp(c.created_at),
        ]);

        table(['ID', 'Name', 'Email', 'Role', 'External ID', 'Created At'], rows);
        return;
      }

      const client = getClient(opts);
      const spin = spinner('Searching contacts...');

      const filters: any[] = [];
      if (opts.email) {
        filters.push({ field: 'email', operator: '=', value: opts.email });
      }
      if (opts.externalId) {
        filters.push({ field: 'external_id', operator: '=', value: opts.externalId });
      }

      const searchBody = {
        query: { operator: 'AND', value: filters },
      };

      const results = await client.paginateSearch(
        '/contacts/search',
        searchBody,
        'data',
        10
      );

      spin.stop();

      if (opts.json) {
        printJson({
          data: results.map(enrichContact),
          total: results.length,
        });
        return;
      }

      if (results.length === 0) {
        info('No contacts found.');
        return;
      }

      const rows = results.map((c: any) => [
        String(c.id),
        c.name || '—',
        c.email || '—',
        c.role || '—',
        c.external_id || '—',
        isoTimestamp(c.created_at),
      ]);

      table(['ID', 'Name', 'Email', 'Role', 'External ID', 'Created At'], rows);
    });

  // --- create ---
  contacts
    .command('create')
    .description('Create a new contact')
    .option('--email <email>', 'Contact email')
    .option('--name <name>', 'Contact name')
    .option('--role <role>', 'Role: user or lead', 'lead')
    .option('--external-id <id>', 'Your system\'s user ID')
    .option('--phone <phone>', 'Phone number')
    .option('--json', 'Output as JSON')
    .option('--demo', 'Use demo mode with mock data')
    .action(async (opts) => {
      if (opts.demo) {
        const newContact = {
          type: 'contact',
          id: '6601ff93',
          name: opts.name || null,
          email: opts.email || null,
          phone: opts.phone || null,
          role: opts.role || 'lead',
          external_id: opts.externalId || null,
          created_at: Math.floor(Date.now() / 1000),
          updated_at: Math.floor(Date.now() / 1000),
          last_seen_at: null,
        };
        if (opts.json) {
          printJson(enrichContact(newContact));
          return;
        }
        success(`Contact created with ID ${newContact.id}.`);
        return;
      }

      const client = getClient(opts);

      const body: Record<string, any> = { role: opts.role };
      if (opts.email) body.email = opts.email;
      if (opts.name) body.name = opts.name;
      if (opts.externalId) body.external_id = opts.externalId;
      if (opts.phone) body.phone = opts.phone;

      const spin = spinner('Creating contact...');
      const contact = await client.post('/contacts', body);
      spin.stop();

      if (opts.json) {
        printJson(enrichContact(contact));
        return;
      }

      success(`Contact created with ID ${contact.id}.`);
    });

  // --- update ---
  contacts
    .command('update <id>')
    .description('Update an existing contact')
    .option('--email <email>', 'New email')
    .option('--name <name>', 'New name')
    .option('--role <role>', 'New role: user or lead')
    .option('--external-id <id>', 'New external ID')
    .option('--phone <phone>', 'New phone')
    .option('--json', 'Output as JSON')
    .option('--demo', 'Use demo mode with mock data')
    .action(async (id, opts) => {
      const body: Record<string, any> = {};
      if (opts.email) body.email = opts.email;
      if (opts.name) body.name = opts.name;
      if (opts.role) body.role = opts.role;
      if (opts.externalId) body.external_id = opts.externalId;
      if (opts.phone) body.phone = opts.phone;

      if (Object.keys(body).length === 0) {
        error('Provide at least one field to update: --email, --name, --role, --external-id, or --phone.');
      }

      if (opts.demo) {
        const contact = mockContacts.find((c) => String(c.id) === id) || mockContacts[0];
        const updated = { ...contact, ...body, updated_at: Math.floor(Date.now() / 1000) };
        if (opts.json) {
          printJson(enrichContact(updated));
          return;
        }
        success(`Contact ${id} updated.`);
        return;
      }

      const client = getClient(opts);
      const spin = spinner(`Updating contact ${id}...`);
      const contact = await client.put(`/contacts/${id}`, body);
      spin.stop();

      if (opts.json) {
        printJson(enrichContact(contact));
        return;
      }

      success(`Contact ${id} updated.`);
    });

  // --- conversations ---
  contacts
    .command('conversations <id>')
    .description('List all conversations for a contact')
    .option('--limit <n>', 'Max results', '20')
    .option('--json', 'Output as JSON')
    .option('--demo', 'Use demo mode with mock data')
    .action(async (id, opts) => {
      if (opts.demo) {
        // Return a subset of mock conversations as if they belong to this contact
        const results = mockConversations.slice(0, 2);

        if (opts.json) {
          printJson({
            data: results.map((c: any) => ({
              ...c,
              id: String(c.id),
              updated_at_human: isoTimestamp(c.updated_at),
            })),
            total: results.length,
          });
          return;
        }

        const rows = results.map((c: any) => {
          const preview =
            c.title ||
            (c.source?.body || '—').replace(/<[^>]+>/g, '').slice(0, 50);
          return [
            String(c.id),
            c.state || '—',
            preview,
            isoTimestamp(c.updated_at),
          ];
        });

        table(['Conversation ID', 'State', 'Last Message Preview', 'Updated At'], rows);
        return;
      }

      const client = getClient(opts);
      const spin = spinner(`Fetching conversations for contact ${id}...`);
      const limit = parseInt(opts.limit, 10) || 20;

      const results = await client.paginate(
        `/contacts/${id}/conversations`,
        {},
        'conversations',
        limit
      );

      spin.stop();

      if (opts.json) {
        printJson({
          data: results.map((c: any) => ({
            ...c,
            id: String(c.id),
            updated_at_human: isoTimestamp(c.updated_at),
          })),
          total: results.length,
        });
        return;
      }

      if (results.length === 0) {
        info('No conversations found for this contact.');
        return;
      }

      const rows = results.map((c: any) => {
        const preview =
          c.title ||
          (c.source?.body || c.conversation_message?.body || '—').replace(/<[^>]+>/g, '').slice(0, 50);
        return [
          String(c.id),
          c.state || '—',
          preview,
          isoTimestamp(c.updated_at),
        ];
      });

      table(['Conversation ID', 'State', 'Last Message Preview', 'Updated At'], rows);
    });
}
