import { Command } from 'commander';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
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
import { mockConversations, mockTags as mockTagsList } from '../mock';

dayjs.extend(relativeTime);

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
    process.exit(2); // unreachable but satisfies TS
  }
  return new IntercomClient(resolved.token, resolved.region);
}

function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}

function humanDuration(ts: number | null | undefined): string {
  if (!ts) return '—';
  return dayjs(ts * 1000).fromNow(true);
}

function isoTimestamp(ts: number | null | undefined): string {
  if (!ts) return '—';
  return dayjs(ts * 1000).toISOString();
}

function preview(text: string | null | undefined, maxLen = 60): string {
  if (!text) return '—';
  const clean = stripHtml(text);
  if (clean.length <= maxLen) return clean;
  return clean.slice(0, maxLen - 1) + '…';
}

function enrichConversation(c: any): any {
  return {
    ...c,
    id: String(c.id),
    created_at_human: isoTimestamp(c.created_at),
    updated_at_human: isoTimestamp(c.updated_at),
    waiting_since_human: isoTimestamp(c.waiting_since),
    waiting_since_minutes: c.waiting_since
      ? Math.round((Date.now() / 1000 - c.waiting_since) / 60)
      : null,
  };
}

function renderConversationTable(conversations: any[]): void {
  const rows = conversations.map((c: any) => {
    const assignee = c.admin_assignee_id
      ? String(c.admin_assignee_id)
      : c.team_assignee_id
        ? `Team ${c.team_assignee_id}`
        : '—';

    const subject =
      c.title ||
      preview(c.source?.body) ||
      preview(c.conversation_message?.body) ||
      '—';

    const tags = (c.tags?.tags || []).map((t: any) => t.name).join(', ') || '—';

    return [
      String(c.id),
      c.state || '—',
      subject,
      assignee,
      c.waiting_since ? humanDuration(c.waiting_since) : '—',
      tags,
    ];
  });

  table(
    ['ID', 'State', 'Subject/Preview', 'Assignee', 'Waiting', 'Tags'],
    rows
  );
}

function renderConversationThread(id: string, conversation: any): void {
  const title = conversation.title || 'Untitled conversation';
  console.log(`\n${'─'.repeat(60)}`);
  console.log(`Conversation #${id}: ${title}`);
  console.log(`State: ${conversation.state}  |  Created: ${isoTimestamp(conversation.created_at)}`);
  console.log(`${'─'.repeat(60)}\n`);

  const source = conversation.source || conversation.conversation_message;
  if (source) {
    const author =
      source.author?.name || source.author?.email || 'Unknown';
    const body = stripHtml(source.body || '');
    const time = isoTimestamp(conversation.created_at);
    console.log(`[${time}] ${author}:`);
    console.log(`  ${body}\n`);
  }

  const parts = conversation.conversation_parts?.conversation_parts || [];
  for (const part of parts) {
    const author =
      part.author?.name || part.author?.email || part.author?.type || 'System';
    const time = isoTimestamp(part.created_at);
    const partType = part.part_type || '';
    const body = stripHtml(part.body || '');

    if (partType === 'assignment') {
      const assigned = part.assigned_to?.name || part.assigned_to?.email || 'unknown';
      console.log(`[${time}] ← Assigned to ${assigned} by ${author}`);
    } else if (partType === 'close') {
      console.log(`[${time}] ← Closed by ${author}`);
    } else if (partType === 'open') {
      console.log(`[${time}] ← Reopened by ${author}`);
    } else if (body) {
      const label = partType === 'note' ? `${author} (note)` : author;
      console.log(`[${time}] ${label}:`);
      console.log(`  ${body}`);
    } else {
      console.log(`[${time}] ← ${partType} by ${author}`);
    }
    console.log();
  }
}

export function registerConversationCommands(program: Command): void {
  const conv = program
    .command('conversations')
    .alias('conv')
    .description('Manage Intercom conversations');

  // --- list ---
  conv
    .command('list')
    .description('List conversations')
    .option('--state <state>', 'Filter by state: open, closed, snoozed, pending', 'open')
    .option('--assigned-to <admin_id>', 'Filter by assignee admin ID')
    .option('--team <team_id>', 'Filter by team ID')
    .option('--limit <n>', 'Max results (default: 20, max: 150)', '20')
    .option('--sort <field>', 'Sort by: created_at, updated_at', 'updated_at')
    .option('--json', 'Output as JSON')
    .option('--demo', 'Use demo mode with mock data')
    .action(async (opts) => {
      if (opts.demo) {
        let conversations = [...mockConversations];
        if (opts.state) {
          conversations = conversations.filter((c) => c.state === opts.state);
        }
        if (opts.assignedTo) {
          conversations = conversations.filter(
            (c) => String(c.admin_assignee_id) === opts.assignedTo
          );
        }
        const limit = Math.min(parseInt(opts.limit, 10) || 20, 150);
        conversations = conversations.slice(0, limit);

        if (opts.json) {
          printJson({
            data: conversations.map(enrichConversation),
            total: conversations.length,
          });
          return;
        }
        if (conversations.length === 0) {
          info('No conversations found.');
          return;
        }
        renderConversationTable(conversations);
        return;
      }

      const client = getClient(opts);
      const spin = spinner('Fetching conversations...');

      const limit = Math.min(parseInt(opts.limit, 10) || 20, 150);

      const filters: any[] = [];
      if (opts.state) {
        filters.push({
          field: 'state',
          operator: '=',
          value: opts.state,
        });
      }
      if (opts.assignedTo) {
        filters.push({
          field: 'admin_assignee_id',
          operator: '=',
          value: opts.assignedTo,
        });
      }
      if (opts.team) {
        filters.push({
          field: 'team_assignee_id',
          operator: '=',
          value: opts.team,
        });
      }

      const searchBody: any = {
        query: {
          operator: 'AND',
          value: filters.length > 0 ? filters : [{ field: 'state', operator: '=', value: opts.state || 'open' }],
        },
        sort: {
          field: opts.sort || 'updated_at',
          order: 'desc',
        },
        pagination: { per_page: Math.min(limit, 50) },
      };

      const conversations = await client.paginateSearch(
        '/conversations/search',
        searchBody,
        'conversations',
        limit
      );

      spin.stop();

      if (opts.json) {
        printJson({
          data: conversations.map(enrichConversation),
          total: conversations.length,
        });
        return;
      }

      if (conversations.length === 0) {
        info('No conversations found.');
        return;
      }

      renderConversationTable(conversations);
    });

  // --- get ---
  conv
    .command('get <id>')
    .description('Get a conversation with its full message thread')
    .option('--json', 'Output as JSON')
    .option('--demo', 'Use demo mode with mock data')
    .action(async (id, opts) => {
      if (opts.demo) {
        const conversation = mockConversations.find((c) => String(c.id) === id);
        if (!conversation) {
          if (opts.json) {
            jsonError('NOT_FOUND', `Conversation ${id} not found.`, 404, 3);
          }
          error(`Conversation ${id} not found.`, 3);
          return;
        }
        if (opts.json) {
          printJson(enrichConversation(conversation));
          return;
        }
        renderConversationThread(id, conversation);
        return;
      }

      const client = getClient(opts);
      const spin = spinner(`Fetching conversation ${id}...`);

      const conversation = await client.get(`/conversations/${id}`, {
        display_as: 'plaintext',
      });

      spin.stop();

      if (opts.json) {
        printJson(enrichConversation(conversation));
        return;
      }

      renderConversationThread(id, conversation);
    });

  // --- reply ---
  conv
    .command('reply <id>')
    .description('Reply to a conversation')
    .requiredOption('--message <text>', 'Reply message body')
    .option('--admin-id <id>', 'Admin ID sending the reply')
    .option('--type <type>', 'Reply type: comment or note', 'comment')
    .option('--json', 'Output as JSON')
    .option('--demo', 'Use demo mode with mock data')
    .action(async (id, opts) => {
      if (opts.demo) {
        if (opts.json) {
          const conversation = mockConversations.find((c) => String(c.id) === id) || mockConversations[0];
          printJson(enrichConversation(conversation));
          return;
        }
        success(
          `${opts.type === 'note' ? 'Note' : 'Reply'} sent on conversation ${id}.`
        );
        return;
      }

      const client = getClient(opts);

      if (!opts.adminId) {
        const me = await client.get('/me');
        opts.adminId = String(me.id);
      }

      const body: any = {
        message_type: opts.type,
        type: 'admin',
        admin_id: opts.adminId,
        body: opts.message,
      };

      const spin = spinner(`Sending ${opts.type} on conversation ${id}...`);
      const result = await client.post(`/conversations/${id}/reply`, body);
      spin.stop();

      if (opts.json) {
        printJson(enrichConversation(result));
        return;
      }

      success(
        `${opts.type === 'note' ? 'Note' : 'Reply'} sent on conversation ${id}.`
      );
    });

  // --- assign ---
  conv
    .command('assign <id>')
    .description('Assign a conversation to an admin or team')
    .option('--admin <admin_id>', 'Assign to admin ID')
    .option('--team <team_id>', 'Assign to team ID')
    .option('--unassign', 'Remove current assignment')
    .option('--json', 'Output as JSON')
    .option('--demo', 'Use demo mode with mock data')
    .action(async (id, opts) => {
      if (opts.demo) {
        if (!opts.admin && !opts.team && !opts.unassign) {
          error('Provide --admin <id>, --team <id>, or --unassign.');
        }
        if (opts.json) {
          const conversation = mockConversations.find((c) => String(c.id) === id) || mockConversations[0];
          printJson(enrichConversation(conversation));
          return;
        }
        if (opts.unassign) {
          success(`Conversation ${id} unassigned.`);
        } else if (opts.admin) {
          success(`Conversation ${id} assigned to admin ${opts.admin}.`);
        } else {
          success(`Conversation ${id} assigned to team ${opts.team}.`);
        }
        return;
      }

      const client = getClient(opts);

      const me = await client.get('/me');
      const adminId = String(me.id);

      const body: any = {
        message_type: 'assignment',
        type: 'admin',
        admin_id: adminId,
      };

      if (opts.unassign) {
        body.assignee_id = '0';
      } else if (opts.admin) {
        body.assignee_id = opts.admin;
      } else if (opts.team) {
        body.assignee_id = opts.team;
      } else {
        error('Provide --admin <id>, --team <id>, or --unassign.');
      }

      const spin = spinner(`Assigning conversation ${id}...`);
      const result = await client.post(`/conversations/${id}/parts`, body);
      spin.stop();

      if (opts.json) {
        printJson(enrichConversation(result));
        return;
      }

      if (opts.unassign) {
        success(`Conversation ${id} unassigned.`);
      } else if (opts.admin) {
        success(`Conversation ${id} assigned to admin ${opts.admin}.`);
      } else {
        success(`Conversation ${id} assigned to team ${opts.team}.`);
      }
    });

  // --- close ---
  conv
    .command('close <id>')
    .description('Close a conversation')
    .option('--json', 'Output as JSON')
    .option('--demo', 'Use demo mode with mock data')
    .action(async (id, opts) => {
      if (opts.demo) {
        if (opts.json) {
          const conversation = mockConversations.find((c) => String(c.id) === id) || mockConversations[0];
          printJson(enrichConversation({ ...conversation, state: 'closed' }));
          return;
        }
        success(`Conversation ${id} closed.`);
        return;
      }

      const client = getClient(opts);

      const me = await client.get('/me');
      const adminId = String(me.id);

      const body = {
        message_type: 'close',
        type: 'admin',
        admin_id: adminId,
      };

      const spin = spinner(`Closing conversation ${id}...`);
      const result = await client.post(`/conversations/${id}/parts`, body);
      spin.stop();

      if (opts.json) {
        printJson(enrichConversation(result));
        return;
      }

      success(`Conversation ${id} closed.`);
    });

  // --- snooze ---
  conv
    .command('snooze <id>')
    .description('Snooze a conversation until a specific time')
    .requiredOption('--until <datetime>', 'Snooze until this datetime (ISO 8601 or YYYY-MM-DD)')
    .option('--json', 'Output as JSON')
    .option('--demo', 'Use demo mode with mock data')
    .action(async (id, opts) => {
      const snoozedUntil = dayjs(opts.until);
      if (!snoozedUntil.isValid()) {
        error(`Invalid datetime: "${opts.until}". Use ISO 8601 or YYYY-MM-DD format.`);
      }

      if (opts.demo) {
        if (opts.json) {
          const conversation = mockConversations.find((c) => String(c.id) === id) || mockConversations[0];
          printJson(enrichConversation({ ...conversation, state: 'snoozed', snoozed_until: snoozedUntil.unix() }));
          return;
        }
        success(`Conversation ${id} snoozed until ${snoozedUntil.toISOString()}.`);
        return;
      }

      const client = getClient(opts);

      const me = await client.get('/me');
      const adminId = String(me.id);

      const body = {
        message_type: 'snoozed',
        type: 'admin',
        admin_id: adminId,
        snoozed_until: snoozedUntil.unix(),
      };

      const spin = spinner(`Snoozing conversation ${id}...`);
      const result = await client.post(`/conversations/${id}/parts`, body);
      spin.stop();

      if (opts.json) {
        printJson(enrichConversation(result));
        return;
      }

      success(`Conversation ${id} snoozed until ${snoozedUntil.toISOString()}.`);
    });

  // --- tag ---
  conv
    .command('tag <id>')
    .description('Tag a conversation')
    .requiredOption('--tag <tag_name>', 'Tag name to apply')
    .option('--admin-id <id>', 'Admin ID performing the action')
    .option('--json', 'Output as JSON')
    .option('--demo', 'Use demo mode with mock data')
    .action(async (id, opts) => {
      if (opts.demo) {
        const tag = mockTagsList.find(
          (t) => t.name.toLowerCase() === opts.tag.toLowerCase()
        );
        if (!tag) {
          if (opts.json) {
            jsonError('NOT_FOUND', `Tag "${opts.tag}" not found.`, 404, 3);
          }
          error(`Tag "${opts.tag}" not found. Create it first with: intercom tags create --name "${opts.tag}"`, 3);
          return;
        }
        if (opts.json) {
          printJson({ type: 'tag', id: tag.id, name: tag.name });
          return;
        }
        success(`Tag "${opts.tag}" applied to conversation ${id}.`);
        return;
      }

      const client = getClient(opts);

      let adminId = opts.adminId;
      if (!adminId) {
        const me = await client.get('/me');
        adminId = String(me.id);
      }

      const tagsResponse = await client.get('/tags');
      const tags = tagsResponse.data || [];
      const tag = tags.find(
        (t: any) => t.name.toLowerCase() === opts.tag.toLowerCase()
      );

      if (!tag) {
        if (opts.json) {
          jsonError('NOT_FOUND', `Tag "${opts.tag}" not found.`, 404, 3);
        }
        error(`Tag "${opts.tag}" not found. Create it first with: intercom tags create --name "${opts.tag}"`, 3);
      }

      const body = {
        admin_id: adminId,
        id: tag.id,
      };

      const spin = spinner(`Tagging conversation ${id}...`);
      const result = await client.post(
        `/conversations/${id}/tags`,
        body
      );
      spin.stop();

      if (opts.json) {
        printJson(result);
        return;
      }

      success(`Tag "${opts.tag}" applied to conversation ${id}.`);
    });

  // --- search ---
  conv
    .command('search')
    .description('Search conversations')
    .option('--query <text>', 'Full-text search query')
    .option('--state <state>', 'Filter by state')
    .option('--tag <tag_name>', 'Filter by tag name')
    .option('--after <date>', 'Created after date (YYYY-MM-DD)')
    .option('--before <date>', 'Created before date (YYYY-MM-DD)')
    .option('--limit <n>', 'Max results', '20')
    .option('--json', 'Output as JSON')
    .option('--demo', 'Use demo mode with mock data')
    .action(async (opts) => {
      if (opts.demo) {
        let conversations = [...mockConversations];

        if (!opts.query && !opts.state && !opts.tag && !opts.after && !opts.before) {
          error('Provide at least one search filter: --query, --state, --tag, --after, or --before.');
        }

        if (opts.query) {
          const q = opts.query.toLowerCase();
          conversations = conversations.filter(
            (c) =>
              (c.title || '').toLowerCase().includes(q) ||
              stripHtml(c.source?.body || '').toLowerCase().includes(q)
          );
        }
        if (opts.state) {
          conversations = conversations.filter((c) => c.state === opts.state);
        }
        if (opts.tag) {
          const tagLower = opts.tag.toLowerCase();
          conversations = conversations.filter((c) =>
            (c.tags?.tags || []).some((t: any) => t.name.toLowerCase() === tagLower)
          );
        }

        const limit = Math.min(parseInt(opts.limit, 10) || 20, 150);
        conversations = conversations.slice(0, limit);

        if (opts.json) {
          printJson({
            data: conversations.map(enrichConversation),
            total: conversations.length,
          });
          return;
        }

        if (conversations.length === 0) {
          info('No conversations found matching your search.');
          return;
        }

        const rows = conversations.map((c: any) => {
          const assignee = c.admin_assignee_id
            ? String(c.admin_assignee_id)
            : '—';
          const subject =
            c.title ||
            preview(c.source?.body) ||
            preview(c.conversation_message?.body) ||
            '—';
          return [
            String(c.id),
            c.state || '—',
            subject,
            assignee,
            isoTimestamp(c.updated_at),
          ];
        });

        table(['ID', 'State', 'Subject/Preview', 'Assignee', 'Updated'], rows);
        return;
      }

      const client = getClient(opts);
      const spin = spinner('Searching conversations...');

      const limit = Math.min(parseInt(opts.limit, 10) || 20, 150);
      const filters: any[] = [];

      if (opts.query) {
        filters.push({
          field: 'source.body',
          operator: '~',
          value: opts.query,
        });
      }
      if (opts.state) {
        filters.push({
          field: 'state',
          operator: '=',
          value: opts.state,
        });
      }
      if (opts.tag) {
        const tagsResponse = await client.get('/tags');
        const allTags = tagsResponse.data || [];
        const matchedTag = allTags.find(
          (t: any) => t.name.toLowerCase() === opts.tag.toLowerCase()
        );
        if (!matchedTag) {
          spin.stop();
          if (opts.json) {
            jsonError('NOT_FOUND', `Tag "${opts.tag}" not found.`, 404, 3);
          }
          error(`Tag "${opts.tag}" not found. List tags with: intercom tags list`, 3);
        }
        filters.push({
          field: 'tag_ids',
          operator: '=',
          value: matchedTag.id,
        });
      }
      if (opts.after) {
        const afterTs = dayjs(opts.after);
        if (afterTs.isValid()) {
          filters.push({
            field: 'created_at',
            operator: '>',
            value: afterTs.unix(),
          });
        }
      }
      if (opts.before) {
        const beforeTs = dayjs(opts.before);
        if (beforeTs.isValid()) {
          filters.push({
            field: 'created_at',
            operator: '<',
            value: beforeTs.unix(),
          });
        }
      }

      if (filters.length === 0) {
        spin.stop();
        error('Provide at least one search filter: --query, --state, --tag, --after, or --before.');
      }

      const searchBody = {
        query: {
          operator: 'AND',
          value: filters,
        },
        sort: { field: 'updated_at', order: 'desc' },
        pagination: { per_page: Math.min(limit, 50) },
      };

      const conversations = await client.paginateSearch(
        '/conversations/search',
        searchBody,
        'conversations',
        limit
      );

      spin.stop();

      if (opts.json) {
        printJson({
          data: conversations.map(enrichConversation),
          total: conversations.length,
        });
        return;
      }

      if (conversations.length === 0) {
        info('No conversations found matching your search.');
        return;
      }

      const rows = conversations.map((c: any) => {
        const assignee = c.admin_assignee_id
          ? String(c.admin_assignee_id)
          : '—';
        const subject =
          c.title ||
          preview(c.source?.body) ||
          preview(c.conversation_message?.body) ||
          '—';

        return [
          String(c.id),
          c.state || '—',
          subject,
          assignee,
          isoTimestamp(c.updated_at),
        ];
      });

      table(['ID', 'State', 'Subject/Preview', 'Assignee', 'Updated'], rows);
    });
}
