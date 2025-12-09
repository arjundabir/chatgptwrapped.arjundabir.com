const YEAR_2025_START = Math.floor(new Date(2025, 0, 1).getTime() / 1000);

interface MappingNode {
  id?: string;
  message?: {
    id?: string;
    author?: {
      role?: string;
      name?: string | null;
      metadata?: Record<string, unknown>;
    };
    create_time?: number;
    content?: {
      parts?: string[];
      content_type?: string;
    } | string;
    metadata?: {
      conversation_id?: string;
      turn_exchange_id?: string;
      parent_id?: string;
      is_visually_hidden_from_conversation?: boolean;
      [key: string]: unknown;
    };
  } | null;
  parent?: string | null;
  children?: string[];
}

export interface Conversation {
  id?: string;
  title: string;
  create_time: number;
  update_time: number;
  mapping: Record<string, MappingNode>;
}

export interface FirstConversationData {
  date: Date;
  title: string;
  firstUserMessage?: string;
  firstAssistantMessage?: string;
  conversationId?: string;
}

// Helper function to extract conversation ID and first messages from mapping
function extractConversationData(mapping: Record<string, MappingNode>): {
  conversationId?: string;
  userMessage?: string;
  assistantMessage?: string;
} {
  if (!mapping) return {};
  
  // Find the root node (client-created-root or node with no parent)
  const rootId = Object.keys(mapping).find(
    (id) => id === "client-created-root" || !mapping[id]?.parent
  );
  
  if (!rootId || !mapping[rootId]) return {};
  
  let conversationId: string | undefined;
  const messages: Array<{ role: string; content: string; createTime: number }> = [];
  const visited = new Set<string>();
  
  function traverse(nodeId: string) {
    if (visited.has(nodeId) || !mapping[nodeId]) return;
    visited.add(nodeId);
    
    const node = mapping[nodeId];
    const message = node.message;
    
    // Skip if no message or if visually hidden
    if (message && !message.metadata?.is_visually_hidden_from_conversation) {
      const role = message.author?.role;
      let content = '';
      if (typeof message.content === 'string') {
        content = message.content;
      } else if (message.content && typeof message.content === 'object' && 'parts' in message.content) {
        content = message.content.parts?.[0] || '';
      }
      
      if (role && content) {
        messages.push({
          role,
          content,
          createTime: message.create_time || 0
        });
        
        // Try to extract conversation ID from metadata
        if (!conversationId && message.metadata) {
          const metadata = message.metadata;
          // Try different possible ID fields
          conversationId = metadata.conversation_id || 
                          metadata.turn_exchange_id ||
                          metadata.parent_id;
        }
      }
    }
    
    // Traverse children
    if (node.children && Array.isArray(node.children)) {
      for (const childId of node.children) {
        traverse(childId);
      }
    }
  }
  
  traverse(rootId);
  
  // If we still don't have a conversation ID, try using a root message ID
  // (sometimes the conversation ID is derived from message IDs)
  if (!conversationId && rootId !== "client-created-root") {
    // Try to find a message ID that might be the conversation ID
    const firstMessage = messages[0];
    if (firstMessage) {
      // Look for a node that might represent the conversation
      const possibleIds = Object.keys(mapping).filter(id => {
        const node = mapping[id];
        return node.message && node.message.author?.role === 'user';
      });
      if (possibleIds.length > 0) {
        conversationId = possibleIds[0];
      }
    }
  }
  
  // Sort messages by create_time
  messages.sort((a, b) => a.createTime - b.createTime);
  
  return {
    conversationId,
    userMessage: messages.find(m => m.role === 'user')?.content,
    assistantMessage: messages.find(m => m.role === 'assistant')?.content,
  };
}

/**
 * Parse conversations.json file and extract the first conversation from 2025
 */
export async function parseFirstConversation2025(
  folderHandle: FileSystemDirectoryHandle | null,
  folderName: string | null
): Promise<FirstConversationData | null> {
  if (!folderHandle && !folderName) {
    return null;
  }

  try {
    let conversationsJson: File | null = null;

    if (folderHandle) {
      // Using FileSystem API
      try {
        const fileHandle = await folderHandle.getFileHandle("conversations.json");
        conversationsJson = await fileHandle.getFile();
      } catch (error) {
        console.error("Error reading conversations.json:", error);
        return null;
      }
    } else if (folderName) {
      // Fallback: try to read from input element
      // This is a workaround for when we only have the folder name
      return null;
    }

    if (!conversationsJson) {
      return null;
    }

    const text = await conversationsJson.text();
    const conversations: Conversation[] = JSON.parse(text);

    // Filter conversations for 2025
    const conversations2025 = conversations.filter(
      (conv) => conv.create_time >= YEAR_2025_START
    );

    if (conversations2025.length === 0) {
      return null;
    }

    // Sort by create_time and get the first one
    const firstConversation = conversations2025.sort(
      (a, b) => a.create_time - b.create_time
    )[0];

    const conversationData = extractConversationData(firstConversation.mapping);

    return {
      date: new Date(firstConversation.create_time * 1000),
      title: firstConversation.title || "Untitled Conversation",
      conversationId: firstConversation.id || conversationData.conversationId,
      firstUserMessage: conversationData.userMessage,
      firstAssistantMessage: conversationData.assistantMessage,
    };
  } catch (error) {
    console.error("Error parsing conversations:", error);
    return null;
  }
}

/**
 * Parse conversations from FileList (when using input element)
 */
export async function parseFirstConversationFromFiles(
  files: FileList
): Promise<FirstConversationData | null> {
  try {
    // Find conversations.json in the file list
    let conversationsFile: File | null = null;
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      // Check if it's conversations.json (could be at root or in a subdirectory)
      if (file.name === "conversations.json" || file.name.endsWith("/conversations.json")) {
        conversationsFile = file;
        break;
      }
    }

    if (!conversationsFile) {
      return null;
    }

    const text = await conversationsFile.text();
    const conversations: Conversation[] = JSON.parse(text);

    // Filter conversations for 2025
    const conversations2025 = conversations.filter(
      (conv) => conv.create_time >= YEAR_2025_START
    );

    if (conversations2025.length === 0) {
      return null;
    }

    // Sort by create_time and get the first one
    const firstConversation = conversations2025.sort(
      (a, b) => a.create_time - b.create_time
    )[0];

    const conversationData = extractConversationData(firstConversation.mapping);

    return {
      date: new Date(firstConversation.create_time * 1000),
      title: firstConversation.title || "Untitled Conversation",
      conversationId: firstConversation.id || conversationData.conversationId,
      firstUserMessage: conversationData.userMessage,
      firstAssistantMessage: conversationData.assistantMessage,
    };
  } catch (error) {
    console.error("Error parsing conversations from files:", error);
    return null;
  }
}

