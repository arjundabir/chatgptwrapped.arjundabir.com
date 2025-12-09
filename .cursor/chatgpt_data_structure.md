# ChatGPT Data Export Schema

Complete documentation of the ChatGPT data export structure for building a "ChatGPT Wrapped" application.

---

## Folder Structure

```
chatgpt-data/
├── conversations.json          # Main conversation data (largest file)
├── user.json                   # Account info
├── message_feedback.json       # Thumbs up/down on responses
├── shared_conversations.json   # Publicly shared conversations
├── group_chats.json            # Collaborative group chats
├── shopping.json               # Shopping interactions
├── sora.json                   # Sora video generation history
├── chat.html                   # HTML viewer (not needed)
├── user-{USER_ID}/             # DALL-E generated images folder
│   └── *.png, *.jpg            # Generated images
├── {UUID}/audio/               # Voice conversation folders
│   └── *.wav                   # Voice message audio files
└── file_*.png, file_*.jpg      # User-uploaded images (root level)
```

---

## conversations.json

The main data source. Array of conversation objects.

### Top-Level Structure
```json
[
  {
    "title": "Conversation title",
    "create_time": 1735689600.123,    // Unix timestamp (seconds)
    "update_time": 1735690000.456,    // Unix timestamp (seconds)
    "mapping": { ... }                 // Message tree (see below)
  }
]
```

### Filtering for 2025
```javascript
const YEAR_2025_START = 1735689600; // Jan 1, 2025 00:00:00 UTC
const convos2025 = data.filter(c => c.create_time >= YEAR_2025_START);
```

### The `mapping` Object (Message Tree)

Messages are stored as a **tree/graph structure**, not a flat array. This allows for branched conversations (regenerated responses).

```json
"mapping": {
  "message-uuid-1": {
    "id": "message-uuid-1",
    "message": { ... },           // Message content (see below)
    "parent": "parent-uuid",      // Parent message ID
    "children": ["child-uuid-1"]  // Array of child message IDs
  },
  "message-uuid-2": { ... }
}
```

Special nodes:
- `"client-created-root"` — Root node, has `"message": null`
- System messages have `"is_visually_hidden_from_conversation": true`

### Message Object Structure

```json
{
  "id": "message-uuid",
  "author": {
    "role": "user" | "assistant" | "system" | "tool",
    "name": null | "web.run" | "dalle.text2im" | etc,
    "metadata": {}
  },
  "create_time": 1735689600.123,
  "update_time": null,
  "content": {
    "content_type": "text" | "code" | "thoughts" | "multimodal_text" | etc,
    "parts": ["The actual message text"],
    "language": "python"  // Only for code content_type
  },
  "status": "finished_successfully",
  "end_turn": true | false | null,
  "weight": 1.0,
  "metadata": { ... },            // See metadata section
  "recipient": "all" | "web.run" | "python" | etc,
  "channel": null
}
```

### Author Roles

| Role | Description |
|------|-------------|
| `user` | Human user message |
| `assistant` | ChatGPT response |
| `system` | System prompts (usually hidden) |
| `tool` | Tool response (web search results, code output, etc.) |

### Content Types

| content_type | Description |
|--------------|-------------|
| `text` | Normal text message |
| `code` | Code block with `language` field |
| `thoughts` | Reasoning/thinking content (o1, o3, thinking models) |
| `reasoning_recap` | Summary of reasoning |
| `multimodal_text` | Text mixed with images |
| `image_asset_pointer` | Reference to an image |
| `audio_asset_pointer` | Reference to audio (voice mode) |
| `audio_transcription` | Transcribed voice message |
| `execution_output` | Code interpreter output |
| `sonic_webpage` | Web page snapshot |
| `tether_browsing_display` | Browser display |
| `browser_window` | Browser window content |
| `video_container_asset_pointer` | Video content |
| `system_error` | Error message |

### Recipient Field (Tools)

The `recipient` field indicates which tool a message was sent to:

| Recipient | Tool |
|-----------|------|
| `all` | Normal message (no tool) |
| `web.run` / `web` / `web.search` | Web search |
| `python` | Code interpreter |
| `dalle.text2im` | DALL-E image generation |
| `canmore.update_textdoc` / `canmore.create_textdoc` | Canvas |
| `bio` | Memory |
| `browser.open` / `browser.search` / `browser` | Web browsing |
| `computer.do` / `computer.get` | Computer use (Operator) |
| `research_kickoff_tool.start_research_task` | Deep Research |
| `file_search.msearch` | File search |
| `myfiles_browser` | File browser |

### Metadata Object

```json
"metadata": {
  // Model info
  "model_slug": "gpt-4o" | "o3" | "gpt-5" | etc,
  "default_model_slug": "gpt-4o",
  
  // Message routing
  "request_id": "uuid",
  "turn_exchange_id": "uuid",
  "parent_id": "uuid",
  "message_type": "next",
  
  // Visibility
  "is_visually_hidden_from_conversation": true | false,
  "is_contextual_answers_system_message": true,
  
  // Reasoning (thinking models)
  "reasoning_status": "is_reasoning",
  "reasoning_title": "Finding information...",
  
  // Web search
  "search_queries": [
    {"type": "search", "q": "search query text"}
  ],
  "search_result_groups": [
    {
      "domain": "example.com",
      "entries": [
        {
          "url": "https://...",
          "title": "Page title",
          "snippet": "Preview text..."
        }
      ]
    }
  ]
}
```

### Model Slugs (Known Values)

```
gpt-4o, gpt-4o-mini, gpt-4o-canmore
gpt-4, gpt-4-5
gpt-5, gpt-5-thinking, gpt-5-instant, gpt-5-1, gpt-5-1-thinking, gpt-5-1-instant, gpt-5-t-mini
o1, o1-mini, o1-preview
o3, o3-mini, o3-mini-high
o4-mini, o4-mini-high
text-davinci-002-render-sha (legacy)
research
agent-mode
```

---

## shared_conversations.json

Array of publicly shared conversations.

```json
[
  {
    "id": "share-link-uuid",           // Used in share URL
    "conversation_id": "convo-uuid",   // Links to conversations.json
    "title": "Conversation title",
    "is_anonymous": true | false       // Whether name is hidden
  }
]
```

---

## group_chats.json

Collaborative chats with multiple users.

```json
{
  "chats": [
    {
      "id": "group-chat-uuid",
      "name": "Group name",
      "created_at": "2025-01-01T00:00:00.000000+00:00",  // ISO timestamp
      "updated_at": "2025-01-02T00:00:00.000000+00:00",
      "last_action_at": "2025-01-02T00:00:00.000000+00:00",
      "last_read_at": "2025-01-03T00:00:00.000000+00:00",
      "members": [
        {"id": "user-XXXXX"},
        {"id": "user-YYYYY"}
      ],
      "messages": [
        {
          "id": "message-uuid",
          "role": "user" | "assistant",
          "text": "Message content",
          "attachments": [],
          "created_at": "2025-01-01T00:00:00.000000+00:00",
          "updated_at": "2025-01-01T00:00:00.000000+00:00"
        }
      ]
    }
  ]
}
```

---

## sora.json

Sora video generation history.

```json
{
  "user": {
    "id": "user-XXXXX",
    "name": "User Name",
    "username": "username",
    "is_under_18": false
  },
  "generations": [],                    // Generated video metadata (often empty in export)
  "tasks": [
    {
      "id": "task_xxxxx",
      "title": "Auto-generated title",
      "prompt": "User's prompt text"    // Can be null
    }
  ],
  "presets": [],                        // Saved style presets
  "uploads": []                         // Uploaded videos for remixing
}
```

**Note:** Actual video files are NOT included in the export.

---

## user.json

Account information.

```json
{
  "id": "user-XXXXX",
  "email": "user@example.com",
  "chatgpt_plus_user": true | false,
  "birth_year": 2000,
  "phone_number": "+1234567890"
}
```

---

## Image Files

### Generated Images (DALL-E)
Location: `user-{USER_ID}/file_*.png`

These are images generated by DALL-E at user request.

### Uploaded Images
Location: Root folder `file_*.png`, `file_*.jpg`, `file_*.jpeg`

Two naming patterns:
- `file_000000...sanitized.png` — Processed/sanitized uploads
- `file-{UUID}.png` — Newer format

---

## Audio Files (Voice Mode)

Location: `{CONVERSATION_UUID}/audio/file_*.wav`

Each UUID folder corresponds to a voice conversation. The WAV files are individual voice messages from that conversation.

---

## Extracting Messages from Conversations

Since messages are stored as a tree, use this pattern to extract:

```javascript
function extractMessages(conversation) {
  if (!conversation.mapping) return [];
  
  return Object.values(conversation.mapping)
    .filter(node => {
      // Has a message
      if (!node.message) return false;
      // Not a hidden system message
      if (node.message.metadata?.is_visually_hidden_from_conversation) return false;
      return true;
    })
    .map(node => node.message)
    .sort((a, b) => (a.create_time || 0) - (b.create_time || 0));
}
```

---

## Key Stats to Extract

### From conversations.json:
- Total conversations (filter by year)
- Total messages (user vs assistant)
- Word counts (split content.parts text)
- Days active (unique dates from create_time)
- Longest streak (consecutive days)
- Busiest day (most conversations)
- Time of day patterns (hour from create_time)
- Day of week patterns
- Model usage (count model_slug values)
- Tool usage (count recipient values)
- Content type breakdown
- Topic categories (keyword matching on titles)

### From other files:
- Shared conversations count
- Group chat count and most active
- Sora video attempts and prompts
- Generated image count (file count in user-*/ folder)
- Voice session count (count UUID/audio folders)

---

## Water Calculation

Based on Washington Post reporting (~0.5mL per ChatGPT response):

```javascript
const waterMl = assistantMessageCount * 0.5;
const waterBottles = waterMl / 500; // 500mL per bottle
```

---

## Topic Categorization

Keyword matching on conversation titles:

```javascript
const categories = {
  'Coding': ['code', 'python', 'javascript', 'react', 'api', 'debug', 'function', 'error', 'css', 'html', 'build', 'app'],
  'Writing': ['write', 'essay', 'email', 'letter', 'draft', 'story', 'blog', 'article'],
  'Research': ['find', 'search', 'look', 'research', 'information', 'learn', 'what is', 'how to'],
  'Math': ['calculate', 'math', 'equation', 'number', 'formula', 'statistics'],
  'Creative': ['generate', 'create', 'design', 'idea', 'brainstorm', 'image'],
  'School': ['homework', 'assignment', 'class', 'course', 'study', 'exam', 'university'],
  'Work': ['resume', 'interview', 'job', 'meeting', 'project', 'presentation']
};
```

---

## Timestamps

- `conversations.json` uses **Unix timestamps in seconds** (float)
- `group_chats.json` uses **ISO 8601 strings** with timezone
- `sora.json` uses **ISO 8601 strings**

Convert Unix to Date:
```javascript
const date = new Date(unixTimestamp * 1000);
```