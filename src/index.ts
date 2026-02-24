#!/usr/bin/env node

import { Command } from 'commander';
import { registerAuthCommands } from './commands/auth';
import { registerConversationCommands } from './commands/conversations';
import { registerContactCommands } from './commands/contacts';
import { registerTicketCommands } from './commands/tickets';
import { registerTagCommands } from './commands/tags';
import { registerTeamCommands } from './commands/teams';
import { registerNoteCommands } from './commands/notes';

const program = new Command();

program
  .name('intercom')
  .description(
    'Agent-optimized CLI for the Intercom API.\n\n' +
    'Manage conversations, contacts, tickets, and more from your terminal or AI agent.\n' +
    'Use --json on any command for machine-readable output.'
  )
  .version('0.1.0', '-v, --version', 'Display the CLI version');

// Register all command groups
registerAuthCommands(program);
registerConversationCommands(program);
registerContactCommands(program);
registerTicketCommands(program);
registerTagCommands(program);
registerTeamCommands(program);
registerNoteCommands(program);

// Global error handler for unhandled rejections
process.on('unhandledRejection', (err: any) => {
  const message = err?.message || 'An unexpected error occurred';
  console.error(`\u2717 ${message}`);
  process.exit(1);
});

program.parse(process.argv);
