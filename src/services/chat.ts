import { getOrCreateCollection } from '../chroma';
import { config } from '../config';
import { ChatMessage } from '../types';

const CHAT_COLLECTION = 'chat_messages';

/**
 * Store a chat message in ChromaDB
 */
export async function storeChatMessage(
  sessionId: string,
  message: ChatMessage
): Promise<void> {
  try {
    const collection = await getOrCreateCollection(CHAT_COLLECTION);
    
    // Create a unique ID for the message
    const messageId = `${sessionId}_${Date.now()}`;
    
    // Store the message with metadata
    await collection.add({
      ids: [messageId],
      metadatas: [{
        sessionId,
        role: message.role,
        timestamp: new Date().toISOString(),
      }],
      documents: [message.content],
    });
  } catch (error) {
    console.error('Error storing chat message:', error);
    throw error;
  }
}

/**
 * Retrieve all messages for a session
 */
/**
 * Get all unique session IDs from chat messages
 */
export async function getAllSessions(): Promise<Array<{ id: string; createdAt: Date }>> {
  try {
    const collection = await getOrCreateCollection(CHAT_COLLECTION);
    
    // Get all unique session IDs and their earliest timestamps
    const result = await collection.get();
    
    if (!result.metadatas) {
      return [];
    }

    // Create a map to store earliest message for each session
    const sessionMap = new Map<string, Date>();
    
    result.metadatas.forEach(metadata => {
      if (metadata && typeof metadata.sessionId === 'string' && metadata.timestamp) {
        const sessionId = metadata.sessionId;
        const timestamp = new Date(metadata.timestamp as string);
        
        if (!sessionMap.has(sessionId) || timestamp < (sessionMap.get(sessionId) || new Date())) {
          sessionMap.set(sessionId, timestamp);
        }
      }
    });

    // Convert map to array of session objects
    return Array.from(sessionMap.entries()).map(([id, timestamp]) => ({
      id,
      createdAt: timestamp
    }));
  } catch (error) {
    console.error('Error getting all sessions:', error);
    throw error;
  }
}

export async function getChatMessages(sessionId: string): Promise<ChatMessage[]> {
  try {
    const collection = await getOrCreateCollection(CHAT_COLLECTION);
    
    // Query messages for this session
    const result = await collection.get({
      where: { sessionId: sessionId },
      limit: 1000, // Adjust as needed
    });

    if (!result.documents) {
      return [];
    }

    // Convert to ChatMessage format and filter out null values
    return result.documents
      .map((content, index) => {
        if (!content || !result.metadatas?.[index]?.role) return null;
        return {
          role: result.metadatas[index].role as 'user' | 'assistant',
          content: content
        };
      })
      .filter((msg): msg is ChatMessage => msg !== null);
  } catch (error) {
    console.error('Error retrieving chat messages:', error);
    throw error;
  }
}

/**
 * Delete all messages for a session
 */
export async function deleteChatMessages(sessionId: string): Promise<void> {
  try {
    const collection = await getOrCreateCollection(CHAT_COLLECTION);
    
    // Delete messages for this session
    await collection.delete({
      where: { sessionId: sessionId }
    });
  } catch (error) {
    console.error('Error deleting chat messages:', error);
    throw error;
  }
}
