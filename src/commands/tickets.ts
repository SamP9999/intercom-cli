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
import { mockTickets } from '../mock';

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

function enrichTicket(t: any): any {
  return {
    ...t,
    id: String(t.id),
    created_at_human: isoTimestamp(t.created_at),
    updated_at_human: isoTimestamp(t.updated_at),
  };
}

function renderTicketTable(tickets: any[]): void {
  const rows = tickets.map((t: any) => {
    const title =
      t.ticket_attributes?.title || t.title || '—';
    const state =
      t.ticket_state || t.state || t.ticket_attributes?.state || '—';
    const assignee = t.admin_assignee_id
      ? String(t.admin_assignee_id)
      : '—';
    const contact = t.contacts?.contacts?.[0]
      ? String(t.contacts.contacts[0].id)
      : '—';

    return [
      String(t.id),
      title,
      state,
      assignee,
      contact,
      isoTimestamp(t.created_at),
    ];
  });

  table(['ID', 'Title', 'State', 'Assignee', 'Contact', 'Created At'], rows);
}

export function registerTicketCommands(program: Command): void {
  const tickets = program
    .command('tickets')
    .description('Manage Intercom tickets');

  // --- list ---
  tickets
    .command('list')
    .description('List tickets')
    .option('--state <state>', 'Filter: submitted, in_progress, waiting_on_customer, resolved')
    .option('--assigned-to <admin_id>', 'Filter by assignee admin ID')
    .option('--limit <n>', 'Max results (default: 20)', '20')
    .option('--json', 'Output as JSON')
    .option('--demo', 'Use demo mode with mock data')
    .action(async (opts) => {
      if (opts.demo) {
        let filtered = [...mockTickets];
        if (opts.state) {
          filtered = filtered.filter((t) => t.ticket_state === opts.state);
        }
        if (opts.assignedTo) {
          filtered = filtered.filter(
            (t) => String(t.admin_assignee_id) === opts.assignedTo
          );
        }
        const limit = parseInt(opts.limit, 10) || 20;
        filtered = filtered.slice(0, limit);

        if (opts.json) {
          printJson({
            data: filtered.map(enrichTicket),
            total: filtered.length,
          });
          return;
        }

        if (filtered.length === 0) {
          info('No tickets found.');
          return;
        }

        renderTicketTable(filtered);
        return;
      }

      const client = getClient(opts);
      const spin = spinner('Fetching tickets...');
      const limit = parseInt(opts.limit, 10) || 20;

      try {
        const results = await client.paginate('/tickets', {}, 'tickets', limit);
        spin.stop();

        let filtered = results;
        if (opts.state) {
          filtered = filtered.filter(
            (t: any) =>
              t.ticket_state === opts.state ||
              t.state === opts.state ||
              t.ticket_attributes?.state === opts.state
          );
        }
        if (opts.assignedTo) {
          filtered = filtered.filter(
            (t: any) =>
              String(t.admin_assignee_id) === opts.assignedTo
          );
        }

        if (opts.json) {
          printJson({
            data: filtered.map(enrichTicket),
            total: filtered.length,
          });
          return;
        }

        if (filtered.length === 0) {
          info('No tickets found.');
          return;
        }

        renderTicketTable(filtered);
      } catch {
        spin.stop();
        error(
          'Could not fetch tickets. The Tickets API may require additional permissions or a specific Intercom plan.'
        );
      }
    });

  // --- get ---
  tickets
    .command('get <id>')
    .description('Get a ticket by ID')
    .option('--json', 'Output as JSON')
    .option('--demo', 'Use demo mode with mock data')
    .action(async (id, opts) => {
      if (opts.demo) {
        const ticket = mockTickets.find((t) => String(t.id) === id);
        if (!ticket) {
          if (opts.json) {
            jsonError('NOT_FOUND', `Ticket ${id} not found.`, 404, 3);
          }
          error(`Ticket ${id} not found.`, 3);
          return;
        }
        if (opts.json) {
          printJson(enrichTicket(ticket));
          return;
        }
        table(
          ['Field', 'Value'],
          [
            ['ID', String(ticket.id)],
            ['Title', ticket.title],
            ['State', ticket.ticket_state],
            ['Created', isoTimestamp(ticket.created_at)],
            ['Updated', isoTimestamp(ticket.updated_at)],
          ]
        );
        return;
      }

      const client = getClient(opts);
      const spin = spinner(`Fetching ticket ${id}...`);

      const ticket = await client.get(`/tickets/${id}`);
      spin.stop();

      if (opts.json) {
        printJson(enrichTicket(ticket));
        return;
      }

      const title = ticket.ticket_attributes?.title || ticket.title || '—';
      const state = ticket.ticket_state || ticket.state || '—';

      table(
        ['Field', 'Value'],
        [
          ['ID', String(ticket.id)],
          ['Title', title],
          ['State', state],
          ['Created', isoTimestamp(ticket.created_at)],
          ['Updated', isoTimestamp(ticket.updated_at)],
        ]
      );
    });

  // --- update ---
  tickets
    .command('update <id>')
    .description('Update a ticket')
    .option('--state <state>', 'New state: submitted, in_progress, waiting_on_customer, resolved')
    .option('--assign-to <admin_id>', 'Assign to admin ID')
    .option('--json', 'Output as JSON')
    .option('--demo', 'Use demo mode with mock data')
    .action(async (id, opts) => {
      const body: Record<string, any> = {};
      if (opts.state) body.ticket_state = opts.state;
      if (opts.assignTo) body.admin_assignee_id = opts.assignTo;

      if (Object.keys(body).length === 0) {
        error('Provide at least one option: --state or --assign-to.');
      }

      if (opts.demo) {
        const ticket = mockTickets.find((t) => String(t.id) === id) || mockTickets[0];
        const updated = {
          ...ticket,
          ...body,
          ticket_state: body.state || ticket.ticket_state,
          updated_at: Math.floor(Date.now() / 1000),
        };
        if (opts.json) {
          printJson(enrichTicket(updated));
          return;
        }
        success(`Ticket ${id} updated.`);
        return;
      }

      const client = getClient(opts);
      const spin = spinner(`Updating ticket ${id}...`);
      const ticket = await client.put(`/tickets/${id}`, body);
      spin.stop();

      if (opts.json) {
        printJson(enrichTicket(ticket));
        return;
      }

      success(`Ticket ${id} updated.`);
    });
}
