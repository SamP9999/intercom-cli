# intercom-cli

Agent-optimized CLI for the [Intercom API](https://developers.intercom.com/docs/references/rest-api/api.intercom.io/). Manage conversations, contacts, tickets, and more from your terminal or AI agent.

Every command supports `--json` for clean, parseable output with no decorations — designed so LLMs and automation tools can reason over Intercom data without ambiguity.

## Installation

```bash
npm install -g intercom-cli
```

Or run directly with npx:

```bash
npx intercom-cli conversations list --json
```

## Authentication

### Interactive login

```bash
intercom auth login
```

You'll be prompted to paste your Intercom API Access Token. Get one from **Settings > Developer > API Keys** in your Intercom workspace.

### Non-interactive (CI / agents)

```bash
export INTERCOM_TOKEN=your_token_here
export INTERCOM_REGION=us  # optional: us, eu, au
```

Token resolution priority:
1. `INTERCOM_TOKEN` environment variable
2. `~/.intercom/config.json` (created by `intercom auth login`)

### Verify auth

```bash
intercom auth whoami
intercom auth whoami --json
```

### Logout

```bash
intercom auth logout
```

## Quick Start

```bash
# List open conversations
intercom conversations list

# Get full conversation thread
intercom conversations get 12345

# Find a contact by email
intercom contacts find --email user@example.com

# Reply to a conversation
intercom conversations reply 12345 --message "We're looking into this now."

# List all tags
intercom tags list
```

## Agent Usage

This CLI is designed for use by AI agents (Claude, GPT-4, Codex, etc.). Follow these conventions:

### Always use `--json`

Every command supports `--json`. When an agent is consuming output, always pass this flag. Output is clean JSON with no spinners, colors, or decorations.

```bash
intercom conversations list --state open --json
```

### Consistent JSON schema

- **Lists** always return: `{ "data": [...], "total": N }`
- **Single items** return the raw object
- **Errors** return: `{ "error": { "code": "...", "message": "...", "status": N } }`

### Deterministic exit codes

| Code | Meaning |
|------|---------|
| 0 | Success |
| 1 | General error |
| 2 | Authentication error |
| 3 | Not found |
| 4 | Rate limited |

### Enriched timestamps

JSON output includes both UNIX timestamps and human-readable ISO 8601:

```json
{
  "created_at": 1700000000,
  "created_at_human": "2023-11-14T22:13:20.000Z"
}
```

### IDs are always strings

All Intercom IDs are returned as strings to avoid integer precision issues.

### No interactive prompts when piped

If `stdout` is not a TTY, the CLI never prompts interactively. It fails with a clear error message and non-zero exit code instead.

### Environment variable auth

For agent environments, use `INTERCOM_TOKEN` instead of the config file:

```bash
INTERCOM_TOKEN=tok_xxx intercom conversations list --json
```

## Agent Demo: Triaging a Support Queue

```bash
# 1. List all open conversations waiting more than 1 hour
intercom conversations list --state open --json | jq '.data[] | select(.waiting_since_minutes > 60)'

# 2. Get the full thread for a specific conversation
intercom conversations get 12345 --json

# 3. Assign a high-priority conversation to a teammate
intercom conversations assign 12345 --admin 67890

# 4. Reply with an internal note (not sent to customer)
intercom conversations reply 12345 --message "Escalating to billing team" --type note

# 5. Tag and close a resolved conversation
intercom conversations tag 12345 --tag "resolved-by-ai"
intercom conversations close 12345
```

## Command Reference

### Auth

| Command | Description |
|---------|-------------|
| `intercom auth login` | Authenticate with API token |
| `intercom auth login --token <token> --region <us\|eu\|au>` | Non-interactive login |
| `intercom auth logout` | Remove stored credentials |
| `intercom auth whoami [--json]` | Show current admin info |

### Conversations

| Command | Description |
|---------|-------------|
| `intercom conversations list` | List conversations (default: open) |
| `intercom conversations list --state <state>` | Filter by: open, closed, snoozed, pending |
| `intercom conversations list --assigned-to <id>` | Filter by assignee |
| `intercom conversations list --team <id>` | Filter by team |
| `intercom conversations list --limit <n>` | Max results (default: 20, max: 150) |
| `intercom conversations list --sort <field>` | Sort by created_at or updated_at |
| `intercom conversations get <id>` | View full conversation thread |
| `intercom conversations reply <id> --message <text>` | Reply to conversation |
| `intercom conversations reply <id> --message <text> --type note` | Add internal note |
| `intercom conversations assign <id> --admin <id>` | Assign to admin |
| `intercom conversations assign <id> --team <id>` | Assign to team |
| `intercom conversations assign <id> --unassign` | Remove assignment |
| `intercom conversations close <id>` | Close conversation |
| `intercom conversations snooze <id> --until <datetime>` | Snooze until datetime |
| `intercom conversations tag <id> --tag <name>` | Tag a conversation |
| `intercom conversations search --query <text>` | Full-text search |
| `intercom conversations search --state <state> --after <date>` | Filtered search |

Alias: `intercom conv` works as shorthand for `intercom conversations`.

### Contacts

| Command | Description |
|---------|-------------|
| `intercom contacts list [--limit <n>]` | List contacts |
| `intercom contacts get <id>` | Get contact details |
| `intercom contacts find --email <email>` | Find by email |
| `intercom contacts find --external-id <id>` | Find by external ID |
| `intercom contacts create --email <email> --name <name>` | Create contact |
| `intercom contacts create --role user --external-id <id>` | Create user with external ID |
| `intercom contacts update <id> --name <name>` | Update contact fields |
| `intercom contacts conversations <id>` | List contact's conversations |

### Tickets

| Command | Description |
|---------|-------------|
| `intercom tickets list` | List tickets |
| `intercom tickets list --state <state>` | Filter: submitted, in_progress, waiting_on_customer, resolved |
| `intercom tickets get <id>` | Get ticket details |
| `intercom tickets update <id> --state <state>` | Update ticket state |
| `intercom tickets update <id> --assign-to <admin_id>` | Reassign ticket |

### Tags

| Command | Description |
|---------|-------------|
| `intercom tags list` | List all tags |
| `intercom tags create --name <name>` | Create a new tag |

### Teams

| Command | Description |
|---------|-------------|
| `intercom teams list` | List all teams |

### Notes

| Command | Description |
|---------|-------------|
| `intercom notes add <contact_id> --body <text>` | Add note to contact |
| `intercom notes list <contact_id>` | List notes on contact |

All commands support `--json` for machine-readable output.

## Configuration

Config is stored at `~/.intercom/config.json`:

```json
{
  "token": "dG9rZW4...",
  "workspace": "Acme Corp",
  "app_id": "abc123",
  "region": "us"
}
```

The file is created with `0600` permissions (owner read/write only).

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `INTERCOM_TOKEN` | API access token (overrides config file) | — |
| `INTERCOM_REGION` | API region: us, eu, au | us |

## API Regions

| Region | Base URL |
|--------|----------|
| US (default) | `https://api.intercom.io` |
| EU | `https://api.eu.intercom.io` |
| AU | `https://api.au.intercom.io` |

Set region during login:

```bash
intercom auth login --region eu
```

Or via environment variable:

```bash
export INTERCOM_REGION=eu
```

## Error Handling

The CLI provides clear, actionable error messages:

- **401**: `Authentication failed. Run 'intercom auth login' to set your token.`
- **403**: `Permission denied. Your token may not have access to this resource.`
- **404**: `Not found: [resource] does not exist.`
- **429**: Auto-retries after the `Retry-After` delay with a progress indicator.
- **5xx**: `Intercom API error ([status]): [message]`
- **Network**: `Could not connect to Intercom. Check your internet connection.`

In `--json` mode, errors output structured JSON to stdout:

```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "Conversation 12345 not found",
    "status": 404
  }
}
```

## Rate Limiting

Intercom allows 1,000 API requests per minute. The CLI:
- Tracks request count per minute window
- Warns when approaching the limit (900+ requests)
- Auto-retries on 429 responses using the `Retry-After` header

## License

MIT
