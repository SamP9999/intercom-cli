/**
 * Realistic mock data for --demo mode.
 * Allows testing the full CLI UX without an Intercom account.
 */

const NOW = Math.floor(Date.now() / 1000);
const HOUR = 3600;
const DAY = 86400;

export const mockAdmins = {
  me: {
    type: 'admin',
    id: '814301',
    name: 'Sarah Chen',
    email: 'sarah@acmecorp.com',
    app: {
      type: 'app',
      id_code: 'tx2p130c',
      name: 'Acme Corp',
    },
  },
};

export const mockConversations = [
  {
    type: 'conversation',
    id: '403920115',
    title: 'Cannot access billing portal',
    state: 'open',
    created_at: NOW - 3 * DAY,
    updated_at: NOW - 2 * HOUR,
    waiting_since: NOW - 2 * HOUR - 14 * 60,
    admin_assignee_id: '814301',
    team_assignee_id: null,
    source: {
      type: 'conversation',
      body: '<p>Hi, I\'ve been trying to access the billing portal but keep getting a 403 error. I need to update our payment method before our subscription renews next week.</p>',
      author: { type: 'user', id: '6601ab3e', name: 'James Wilson', email: 'james@startup.io' },
    },
    conversation_message: {
      body: '<p>Hi, I\'ve been trying to access the billing portal but keep getting a 403 error.</p>',
    },
    tags: { tags: [{ id: '8390211', name: 'billing' }] },
    conversation_parts: {
      conversation_parts: [
        {
          type: 'conversation_part',
          part_type: 'comment',
          body: '<p>Thanks for reaching out, James. Let me check your account permissions.</p>',
          created_at: NOW - 3 * DAY + HOUR,
          author: { type: 'admin', id: '814301', name: 'Sarah Chen', email: 'sarah@acmecorp.com' },
        },
        {
          type: 'conversation_part',
          part_type: 'comment',
          body: '<p>I checked and my role is set to "Admin" but I still can\'t get in. Here\'s the screenshot of the error.</p>',
          created_at: NOW - 2 * DAY,
          author: { type: 'user', id: '6601ab3e', name: 'James Wilson', email: 'james@startup.io' },
        },
        {
          type: 'conversation_part',
          part_type: 'note',
          body: '<p>Checked their account — billing permissions look correct. Might be a caching issue or SSO config problem. Escalating to engineering.</p>',
          created_at: NOW - 1 * DAY,
          author: { type: 'admin', id: '814301', name: 'Sarah Chen', email: 'sarah@acmecorp.com' },
        },
        {
          type: 'conversation_part',
          part_type: 'assignment',
          body: null,
          created_at: NOW - 1 * DAY,
          author: { type: 'admin', id: '814301', name: 'Sarah Chen' },
          assigned_to: { type: 'admin', id: '814305', name: 'Mike Torres' },
        },
      ],
    },
  },
  {
    type: 'conversation',
    id: '403920228',
    title: 'Feature request: bulk export',
    state: 'open',
    created_at: NOW - 5 * DAY,
    updated_at: NOW - 4 * HOUR,
    waiting_since: NOW - 4 * HOUR,
    admin_assignee_id: '814305',
    team_assignee_id: null,
    source: {
      body: '<p>Is there a way to bulk export our contact list? We need it for a migration to a new CRM.</p>',
      author: { type: 'user', id: '6601bc4f', name: 'Priya Sharma', email: 'priya@bigco.com' },
    },
    tags: { tags: [{ id: '8390215', name: 'feature-request' }] },
    conversation_parts: { conversation_parts: [] },
  },
  {
    type: 'conversation',
    id: '403920341',
    title: null,
    state: 'open',
    created_at: NOW - 1 * DAY,
    updated_at: NOW - 45 * 60,
    waiting_since: NOW - 90 * 60,
    admin_assignee_id: null,
    team_assignee_id: '9140',
    source: {
      body: '<p>Your API is returning 500 errors on the /users endpoint intermittently. Started about 2 hours ago. Affecting our production integration.</p>',
      author: { type: 'user', id: '6601cd60', name: 'Alex Kim', email: 'alex@devtools.co' },
    },
    tags: { tags: [{ id: '8390218', name: 'bug' }, { id: '8390220', name: 'urgent' }] },
    conversation_parts: { conversation_parts: [] },
  },
  {
    type: 'conversation',
    id: '403920455',
    title: 'How to set up webhooks?',
    state: 'open',
    created_at: NOW - 12 * HOUR,
    updated_at: NOW - 3 * HOUR,
    waiting_since: NOW - 3 * HOUR,
    admin_assignee_id: '814301',
    team_assignee_id: null,
    source: {
      body: '<p>I\'m trying to set up webhooks for new conversation events but the docs are a bit unclear. Can you point me to the right page?</p>',
      author: { type: 'user', id: '6601de71', name: 'Maria Lopez', email: 'maria@saasco.com' },
    },
    tags: { tags: [] },
    conversation_parts: { conversation_parts: [] },
  },
  {
    type: 'conversation',
    id: '403920502',
    title: 'Downgrade plan request',
    state: 'open',
    created_at: NOW - 6 * HOUR,
    updated_at: NOW - 1 * HOUR,
    waiting_since: NOW - 1 * HOUR,
    admin_assignee_id: null,
    team_assignee_id: null,
    source: {
      body: '<p>We\'d like to downgrade from the Pro plan to Starter. Can you help with that? We want to keep our conversation history.</p>',
      author: { type: 'user', id: '6601ef82', name: 'Tom Baker', email: 'tom@smallbiz.org' },
    },
    tags: { tags: [{ id: '8390211', name: 'billing' }] },
    conversation_parts: { conversation_parts: [] },
  },
];

export const mockContacts = [
  {
    type: 'contact',
    id: '6601ab3e',
    name: 'James Wilson',
    email: 'james@startup.io',
    phone: '+1-555-0101',
    role: 'user',
    external_id: 'usr_2847',
    created_at: NOW - 90 * DAY,
    updated_at: NOW - 2 * DAY,
    last_seen_at: NOW - 2 * HOUR,
    location: { city: 'San Francisco', country: 'US' },
    browser: 'Chrome 120',
    os: 'macOS 14.2',
  },
  {
    type: 'contact',
    id: '6601bc4f',
    name: 'Priya Sharma',
    email: 'priya@bigco.com',
    phone: '+1-555-0102',
    role: 'user',
    external_id: 'usr_3912',
    created_at: NOW - 60 * DAY,
    updated_at: NOW - 5 * DAY,
    last_seen_at: NOW - 4 * HOUR,
    location: { city: 'New York', country: 'US' },
    browser: 'Firefox 121',
    os: 'Windows 11',
  },
  {
    type: 'contact',
    id: '6601cd60',
    name: 'Alex Kim',
    email: 'alex@devtools.co',
    phone: null,
    role: 'user',
    external_id: 'usr_5501',
    created_at: NOW - 30 * DAY,
    updated_at: NOW - 1 * DAY,
    last_seen_at: NOW - 45 * 60,
    location: { city: 'Austin', country: 'US' },
    browser: 'Chrome 120',
    os: 'Ubuntu 22.04',
  },
  {
    type: 'contact',
    id: '6601de71',
    name: 'Maria Lopez',
    email: 'maria@saasco.com',
    phone: '+1-555-0104',
    role: 'user',
    external_id: null,
    created_at: NOW - 15 * DAY,
    updated_at: NOW - 3 * HOUR,
    last_seen_at: NOW - 3 * HOUR,
    location: { city: 'Miami', country: 'US' },
    browser: 'Safari 17',
    os: 'macOS 14.1',
  },
  {
    type: 'contact',
    id: '6601ef82',
    name: 'Tom Baker',
    email: 'tom@smallbiz.org',
    phone: '+1-555-0105',
    role: 'lead',
    external_id: null,
    created_at: NOW - 7 * DAY,
    updated_at: NOW - 1 * HOUR,
    last_seen_at: NOW - 1 * HOUR,
    location: { city: 'Chicago', country: 'US' },
    browser: 'Chrome 120',
    os: 'Windows 10',
  },
];

export const mockTickets = [
  {
    type: 'ticket',
    id: '50012',
    ticket_state: 'in_progress',
    title: 'SSO login broken for SAML users',
    created_at: NOW - 2 * DAY,
    updated_at: NOW - 3 * HOUR,
    admin_assignee_id: '814305',
    contacts: { contacts: [{ id: '6601ab3e' }] },
    ticket_attributes: { title: 'SSO login broken for SAML users', state: 'in_progress' },
  },
  {
    type: 'ticket',
    id: '50013',
    ticket_state: 'submitted',
    title: 'Request access to analytics dashboard',
    created_at: NOW - 1 * DAY,
    updated_at: NOW - 6 * HOUR,
    admin_assignee_id: null,
    contacts: { contacts: [{ id: '6601bc4f' }] },
    ticket_attributes: { title: 'Request access to analytics dashboard', state: 'submitted' },
  },
  {
    type: 'ticket',
    id: '50014',
    ticket_state: 'waiting_on_customer',
    title: 'Data export taking too long',
    created_at: NOW - 4 * DAY,
    updated_at: NOW - 1 * DAY,
    admin_assignee_id: '814301',
    contacts: { contacts: [{ id: '6601cd60' }] },
    ticket_attributes: { title: 'Data export taking too long', state: 'waiting_on_customer' },
  },
  {
    type: 'ticket',
    id: '50015',
    ticket_state: 'resolved',
    title: 'Webhook delivery failures',
    created_at: NOW - 10 * DAY,
    updated_at: NOW - 2 * DAY,
    admin_assignee_id: '814305',
    contacts: { contacts: [{ id: '6601de71' }] },
    ticket_attributes: { title: 'Webhook delivery failures', state: 'resolved' },
  },
];

export const mockTags = [
  { type: 'tag', id: '8390211', name: 'billing' },
  { type: 'tag', id: '8390215', name: 'feature-request' },
  { type: 'tag', id: '8390218', name: 'bug' },
  { type: 'tag', id: '8390220', name: 'urgent' },
  { type: 'tag', id: '8390225', name: 'resolved-by-ai' },
  { type: 'tag', id: '8390230', name: 'vip' },
];

export const mockTeams = [
  { type: 'team', id: '9140', name: 'Engineering Support', admin_ids: ['814305', '814309', '814312'] },
  { type: 'team', id: '9141', name: 'Billing & Accounts', admin_ids: ['814301', '814306'] },
  { type: 'team', id: '9142', name: 'Customer Success', admin_ids: ['814301', '814305', '814306', '814309'] },
];

export const mockNotes: Record<string, any[]> = {
  '6601ab3e': [
    {
      type: 'note',
      id: '701001',
      body: '<p>Enterprise customer, 50-seat plan. Renews March 2025. Key contact for API integration partnership.</p>',
      created_at: NOW - 30 * DAY,
      author: { type: 'admin', id: '814301', name: 'Sarah Chen' },
    },
    {
      type: 'note',
      id: '701002',
      body: '<p>Had billing issue in January — resolved by waiving late fee. Keep an eye on payment status.</p>',
      created_at: NOW - 14 * DAY,
      author: { type: 'admin', id: '814306', name: 'Lisa Park' },
    },
  ],
  '6601bc4f': [
    {
      type: 'note',
      id: '701003',
      body: '<p>Evaluating competitor products. Offered 20% discount on annual plan to retain.</p>',
      created_at: NOW - 10 * DAY,
      author: { type: 'admin', id: '814301', name: 'Sarah Chen' },
    },
  ],
};
