const YEAR_2025_START = Math.floor(new Date(2025, 0, 1).getTime() / 1000);

// Helper function to format a date as YYYY-MM-DD in local time
function formatLocalDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

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
    recipient?: string;
    metadata?: {
      conversation_id?: string;
      turn_exchange_id?: string;
      parent_id?: string;
      is_visually_hidden_from_conversation?: boolean;
      model_slug?: string;
      reasoning_status?: string;
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

export interface DaysActiveData {
  totalDays: number;
  longestStreak: number;
  activeDaysInYear: number;
  contributions: Array<{ date: string; count: number; level: number }>;
}

export interface TimeOfDayData {
  personalityType: 'night owl' | 'early bird' | 'all-day chatter';
  hourlyData: Array<{ hour: number; count: number; label: string }>;
  dayOfWeek: {
    weekday: { count: number; percentage: number };
    weekend: { count: number; percentage: number };
  };
}

export interface ToolsAndModelsData {
  tools: Array<{ name: string; count: number }>;
  models: Array<{ name: string; count: number }>;
  thinkingModeCount: number;
}

export interface GenerationsData {
  imageFiles: File[];
  imageCount: number;
  soraVideoCount: number;
}

export interface ChatsAndMessagesData {
  totalChats: number;
  totalMessages: number;
  wordFrequencies: Array<{ word: string; count: number }>;
}

export interface FinaleSlideData {
  totalChats: number;
  daysUsed: number;
  personalityType: 'night owl' | 'early bird' | 'all-day chatter';
  imageFiles: File[];
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

/**
 * Parse conversations from FileList and calculate days active statistics
 */
export async function parseDaysActiveFromFiles(
  files: FileList
): Promise<DaysActiveData | null> {
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

    // Map to count conversations per day
    const dayCounts = new Map<string, number>();
    
    conversations2025.forEach((conv) => {
      const date = new Date(conv.create_time * 1000);
      // Normalize to local time and format as YYYY-MM-DD
      const dateStr = formatLocalDate(date);
      dayCounts.set(dateStr, (dayCounts.get(dateStr) || 0) + 1);
    });

    // Calculate total unique days
    const totalDays = dayCounts.size;

    // Calculate longest streak of consecutive days
    const sortedDates = Array.from(dayCounts.keys()).sort();
    let longestStreak = 0;
    let currentStreak = 0;
    let previousDate: Date | null = null;

    sortedDates.forEach((dateStr) => {
      // Parse date string as local time (YYYY-MM-DD format)
      const [year, month, day] = dateStr.split('-').map(Number);
      const currentDate = new Date(year, month - 1, day);
      
      if (previousDate === null) {
        currentStreak = 1;
      } else {
        const diffDays = Math.floor(
          (currentDate.getTime() - previousDate.getTime()) / (1000 * 60 * 60 * 24)
        );
        
        if (diffDays === 1) {
          // Consecutive day
          currentStreak += 1;
        } else {
          // Gap found, reset streak
          longestStreak = Math.max(longestStreak, currentStreak);
          currentStreak = 1;
        }
      }
      
      previousDate = currentDate;
    });
    
    // Check final streak
    longestStreak = Math.max(longestStreak, currentStreak);

    // Build contributions array with all days in 2025 (using local time)
    const yearStart = new Date(2025, 0, 1); // January 1, 2025 in local time
    const yearEnd = new Date(2025, 11, 31); // December 31, 2025 in local time
    const allDays: Array<{ date: string; count: number }> = [];
    
    const currentDate = new Date(yearStart);
    while (currentDate <= yearEnd) {
      const dateStr = formatLocalDate(currentDate);
      allDays.push({
        date: dateStr,
        count: dayCounts.get(dateStr) || 0,
      });
      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Calculate max count for level calculation
    const maxCount = Math.max(...Array.from(dayCounts.values()), 1);

    // Build contributions with levels
    const contributions = allDays.map(({ date, count }) => {
      // Calculate level based on count (0-4)
      let level = 0;
      if (count > 0) {
        if (maxCount === 1) {
          level = 1;
        } else {
          // Distribute levels based on count relative to max
          const ratio = count / maxCount;
          if (ratio >= 0.8) level = 4;
          else if (ratio >= 0.6) level = 3;
          else if (ratio >= 0.4) level = 2;
          else level = 1;
        }
      }
      
      return {
        date,
        count,
        level,
      };
    });

    return {
      totalDays,
      longestStreak,
      activeDaysInYear: totalDays, // Same as totalDays for 2025
      contributions,
    };
  } catch (error) {
    console.error("Error parsing days active from files:", error);
    return null;
  }
}

// Helper function to extract all messages from a conversation mapping
function extractAllMessages(mapping: Record<string, MappingNode>): Array<{
  role: string;
  recipient?: string;
  modelSlug?: string;
  reasoningStatus?: string;
}> {
  if (!mapping) return [];
  
  const rootId = Object.keys(mapping).find(
    (id) => id === "client-created-root" || !mapping[id]?.parent
  );
  
  if (!rootId || !mapping[rootId]) return [];
  
  const messages: Array<{
    role: string;
    recipient?: string;
    modelSlug?: string;
    reasoningStatus?: string;
  }> = [];
  const visited = new Set<string>();
  
  function traverse(nodeId: string) {
    if (visited.has(nodeId) || !mapping[nodeId]) return;
    visited.add(nodeId);
    
    const node = mapping[nodeId];
    const message = node.message;
    
    // Skip if no message or if visually hidden
    if (message && !message.metadata?.is_visually_hidden_from_conversation) {
      const role = message.author?.role;
      if (role) {
        const recipient = message.recipient;
        const metadata = message.metadata || {};
        const modelSlug = metadata.model_slug as string | undefined;
        const reasoningStatus = metadata.reasoning_status as string | undefined;
        
        messages.push({
          role,
          recipient,
          modelSlug,
          reasoningStatus,
        });
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
  return messages;
}

// Helper function to map recipient values to friendly tool names
function mapRecipientToToolName(recipient: string | undefined): string | null {
  if (!recipient || recipient === 'all') return null;
  
  if (recipient.startsWith('web.') || recipient === 'web' || recipient === 'web.search') {
    return 'Web Search';
  }
  if (recipient === 'python') {
    return 'Code Interpreter';
  }
  if (recipient.startsWith('canmore.')) {
    return 'Canvas';
  }
  if (recipient === 'bio') {
    return 'Memory';
  }
  if (recipient.startsWith('browser.')) {
    return 'Web Browsing';
  }
  if (recipient.startsWith('computer.')) {
    return 'Computer Use';
  }
  if (recipient.startsWith('research_kickoff_tool.')) {
    return 'Deep Research';
  }
  if (recipient === 'dalle.text2im') {
    return 'DALL-E';
  }
  
  // Return null for unknown recipients
  return null;
}

// Helper function to format model names
function formatModelName(modelSlug: string | undefined): string | null {
  if (!modelSlug) return null;
  
  // Return the model slug as-is, or format it nicely
  return modelSlug;
}

/**
 * Parse conversations from FileList and calculate time of day patterns
 */
export async function parseTimeOfDayFromFiles(
  files: FileList
): Promise<TimeOfDayData | null> {
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

    // Count by hour (0-23) and day of week
    const hourlyCounts = new Array(24).fill(0);
    let weekdayCount = 0;
    let weekendCount = 0;

    conversations2025.forEach((conv) => {
      const date = new Date(conv.create_time * 1000);
      const hour = date.getHours();
      const dayOfWeek = date.getDay(); // 0 = Sunday, 6 = Saturday

      // Count by hour
      hourlyCounts[hour]++;

      // Categorize by day of week
      if (dayOfWeek === 0 || dayOfWeek === 6) {
        // Saturday or Sunday
        weekendCount++;
      } else {
        // Monday-Friday
        weekdayCount++;
      }
    });

    const totalConversations = conversations2025.length;

    // Create hourly data array with labels (12am to 11pm)
    const hourlyData = hourlyCounts.map((count, hour) => {
      let label: string;
      if (hour === 0) {
        label = '12am';
      } else if (hour < 12) {
        label = `${hour}am`;
      } else if (hour === 12) {
        label = '12pm';
      } else {
        label = `${hour - 12}pm`;
      }
      return { hour, count, label };
    });

    // Calculate percentages for day of week
    const weekdayPercentage = totalConversations > 0 ? (weekdayCount / totalConversations) * 100 : 0;
    const weekendPercentage = totalConversations > 0 ? (weekendCount / totalConversations) * 100 : 0;

    // Determine personality type based on hourly data
    // Find peak hours: night (22-5), morning (6-11), afternoon (12-17), evening (18-21)
    const nightHours = [22, 23, 0, 1, 2, 3, 4, 5];
    const morningHours = [6, 7, 8, 9, 10, 11];
    const afternoonHours = [12, 13, 14, 15, 16, 17];
    const eveningHours = [18, 19, 20, 21];

    const nightCount = nightHours.reduce((sum, h) => sum + hourlyCounts[h], 0);
    const morningCount = morningHours.reduce((sum, h) => sum + hourlyCounts[h], 0);
    const afternoonCount = afternoonHours.reduce((sum, h) => sum + hourlyCounts[h], 0);
    const eveningCount = eveningHours.reduce((sum, h) => sum + hourlyCounts[h], 0);

    const nightPercentage = totalConversations > 0 ? (nightCount / totalConversations) * 100 : 0;
    const morningPercentage = totalConversations > 0 ? (morningCount / totalConversations) * 100 : 0;
    const afternoonPercentage = totalConversations > 0 ? (afternoonCount / totalConversations) * 100 : 0;
    const eveningPercentage = totalConversations > 0 ? (eveningCount / totalConversations) * 100 : 0;

    // Determine personality type
    let personalityType: 'night owl' | 'early bird' | 'all-day chatter';
    
    // Find the highest time period
    const maxTime = Math.max(morningPercentage, afternoonPercentage, eveningPercentage, nightPercentage);
    
    if (nightPercentage > 30 || (nightPercentage === maxTime && nightPercentage > 0)) {
      personalityType = 'night owl';
    } else if (morningPercentage > 30 || (morningPercentage === maxTime && morningPercentage > 0)) {
      personalityType = 'early bird';
    } else {
      personalityType = 'all-day chatter';
    }

    return {
      personalityType,
      hourlyData,
      dayOfWeek: {
        weekday: { count: weekdayCount, percentage: weekdayPercentage },
        weekend: { count: weekendCount, percentage: weekendPercentage },
      },
    };
  } catch (error) {
    console.error("Error parsing time of day from files:", error);
    return null;
  }
}

/**
 * Parse conversations from FileList and extract tools and models usage
 */
export async function parseToolsAndModelsFromFiles(
  files: FileList
): Promise<ToolsAndModelsData | null> {
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

    // Count tools and models
    const toolCounts = new Map<string, number>();
    const modelCounts = new Map<string, number>();
    let thinkingModeCount = 0;

    conversations2025.forEach((conv) => {
      const messages = extractAllMessages(conv.mapping);
      
      messages.forEach((msg) => {
        // Count tools (from recipient field on user/assistant messages)
        if (msg.role === 'user' || msg.role === 'assistant') {
          const toolName = mapRecipientToToolName(msg.recipient);
          if (toolName) {
            toolCounts.set(toolName, (toolCounts.get(toolName) || 0) + 1);
          }
        }
        
        // Count models (from assistant messages)
        if (msg.role === 'assistant' && msg.modelSlug) {
          const modelName = formatModelName(msg.modelSlug);
          if (modelName) {
            modelCounts.set(modelName, (modelCounts.get(modelName) || 0) + 1);
          }
          
          // Count thinking mode triggers
          if (msg.reasoningStatus || msg.modelSlug.includes('thinking')) {
            thinkingModeCount++;
          }
        }
      });
    });

    // Convert tools to array and sort alphabetically
    const tools = Array.from(toolCounts.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => a.name.localeCompare(b.name));

    // Convert models to array and sort by count descending
    const models = Array.from(modelCounts.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);

    return {
      tools,
      models,
      thinkingModeCount,
    };
  } catch (error) {
    console.error("Error parsing tools and models from files:", error);
    return null;
  }
}

/**
 * Parse generations from FileList - extract DALL-E images and Sora video counts
 */
export async function parseGenerationsFromFiles(
  files: FileList
): Promise<GenerationsData | null> {
  try {
    let soraVideoCount = 0;

    // Extract image files from user-*/ folders
    // According to docs: Generated Images (DALL-E) are in user-{USER_ID}/ folders
    const imageFiles = Array.from(files).filter((file) => {
      const path = (file as File & { webkitRelativePath?: string }).webkitRelativePath || file.name;
      
      // Check if file is in a user-* folder (anywhere in path)
      const isUserFolder = path.includes('user-');
      
      // Check if it's an image file
      const isImage = /\.(png|jpg|jpeg|gif|webp)$/i.test(file.name);
      
      return isUserFolder && isImage;
    });

    // Parse sora.json to count video tasks
    let soraFile: File | null = null;
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const path = (file as File & { webkitRelativePath?: string }).webkitRelativePath || file.name;
      if (file.name === 'sora.json' || path.endsWith('/sora.json')) {
        soraFile = file;
        break;
      }
    }

    if (soraFile) {
      try {
        const text = await soraFile.text();
        const soraData = JSON.parse(text);
        
        if (soraData.tasks && Array.isArray(soraData.tasks)) {
          // Filter tasks to 2025 if they have timestamps
          // If no timestamps, count all tasks
          const tasks2025 = soraData.tasks.filter((task: { created_at?: string; id?: string }) => {
            if (task.created_at) {
              try {
                const taskDate = new Date(task.created_at);
                return taskDate.getFullYear() === 2025;
              } catch {
                // If date parsing fails, include it
                return true;
              }
            }
            // If no timestamp, include it (assume it's from 2025)
            return true;
          });
          soraVideoCount = tasks2025.length;
        }
      } catch (error) {
        console.error("Error parsing sora.json:", error);
        // Continue with soraVideoCount = 0
      }
    }

    return {
      imageFiles,
      imageCount: imageFiles.length,
      soraVideoCount,
    };
  } catch (error) {
    console.error("Error parsing generations from files:", error);
    return null;
  }
}

// Helper function to extract user messages from a conversation mapping
function extractUserMessages(mapping: Record<string, MappingNode>): number {
  if (!mapping) return 0;
  
  const rootId = Object.keys(mapping).find(
    (id) => id === "client-created-root" || !mapping[id]?.parent
  );
  
  if (!rootId || !mapping[rootId]) return 0;
  
  let userMessageCount = 0;
  const visited = new Set<string>();
  
  function traverse(nodeId: string) {
    if (visited.has(nodeId) || !mapping[nodeId]) return;
    visited.add(nodeId);
    
    const node = mapping[nodeId];
    const message = node.message;
    
    // Skip if no message or if visually hidden
    if (message && !message.metadata?.is_visually_hidden_from_conversation) {
      const role = message.author?.role;
      if (role === 'user') {
        userMessageCount++;
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
  return userMessageCount;
}

// Helper function to process words from titles
function processWordsFromTitles(titles: string[]): Array<{ word: string; count: number }> {
  // Common stop words to filter out
  const stopWords = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by',
    'from', 'up', 'about', 'into', 'through', 'during', 'including', 'against', 'among',
    'throughout', 'despite', 'towards', 'upon', 'concerning', 'to', 'of', 'in', 'for', 'on',
    'with', 'at', 'by', 'from', 'up', 'about', 'into', 'through', 'during', 'including',
    'this', 'that', 'these', 'those', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
    'have', 'has', 'had', 'having', 'do', 'does', 'did', 'doing', 'will', 'would', 'should',
    'could', 'may', 'might', 'must', 'can', 'cannot', 'i', 'you', 'he', 'she', 'it', 'we',
    'they', 'me', 'him', 'her', 'us', 'them', 'my', 'your', 'his', 'her', 'its', 'our',
    'their', 'what', 'which', 'who', 'whom', 'whose', 'where', 'when', 'why', 'how', 'all',
    'each', 'every', 'both', 'few', 'more', 'most', 'other', 'some', 'such', 'no', 'nor',
    'not', 'only', 'own', 'same', 'so', 'than', 'too', 'very', 'just', 'now'
  ]);
  
  const wordCounts = new Map<string, number>();
  
  titles.forEach((title) => {
    if (!title) return;
    
    // Convert to lowercase and remove punctuation
    const cleaned = title.toLowerCase().replace(/[^\w\s]/g, ' ');
    
    // Split into words and filter
    const words = cleaned.split(/\s+/).filter((word) => {
      // Filter out stop words and very short words (1-2 characters)
      return word.length > 2 && !stopWords.has(word);
    });
    
    // Count words
    words.forEach((word) => {
      wordCounts.set(word, (wordCounts.get(word) || 0) + 1);
    });
  });
  
  // Convert to array and sort by frequency (descending)
  return Array.from(wordCounts.entries())
    .map(([word, count]) => ({ word, count }))
    .sort((a, b) => b.count - a.count);
}

/**
 * Parse conversations from FileList and extract chats, messages, and word frequencies
 */
export async function parseChatsAndMessagesFromFiles(
  files: FileList
): Promise<ChatsAndMessagesData | null> {
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

    // Count total conversations
    const totalChats = conversations2025.length;

    // Count total user messages
    let totalMessages = 0;
    conversations2025.forEach((conv) => {
      totalMessages += extractUserMessages(conv.mapping);
    });

    // Extract titles and process words
    const titles = conversations2025
      .map((conv) => conv.title)
      .filter((title) => title && title.trim().length > 0);
    
    const wordFrequencies = processWordsFromTitles(titles);

    return {
      totalChats,
      totalMessages,
      wordFrequencies,
    };
  } catch (error) {
    console.error("Error parsing chats and messages from files:", error);
    return null;
  }
}

/**
 * Parse finale slide data by combining data from other parsed sources
 */
export function parseFinaleSlideData(
  chatsAndMessagesData: ChatsAndMessagesData | null,
  daysActiveData: DaysActiveData | null,
  timeOfDayData: TimeOfDayData | null,
  generationsData: GenerationsData | null
): FinaleSlideData | null {
  if (!chatsAndMessagesData || !daysActiveData || !timeOfDayData) {
    return null;
  }

  return {
    totalChats: chatsAndMessagesData.totalChats,
    daysUsed: daysActiveData.activeDaysInYear,
    personalityType: timeOfDayData.personalityType,
    imageFiles: generationsData?.imageFiles || [],
  };
}

