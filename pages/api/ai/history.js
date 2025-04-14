import { AIAssistantService } from '../../../lib/aiAssistantService';

/**
 * AI History API Endpoint
 * 
 * This endpoint retrieves the conversation history for the authenticated user.
 * It returns the most recent messages from the conversation history,
 * which are used to populate the chat interface when it's opened.
 */
export default async function handler(req, res) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get user from session
    const { user } = await getUser(req);
    
    // If user is not authenticated, return empty history
    if (!user) {
      return res.status(200).json({
        messages: [{
          id: 'welcome',
          role: 'assistant',
          content: 'Hello! I\'m your Sturij Furniture Design assistant. How can I help you today?'
        }]
      });
    }
    
    // Initialize AI assistant service
    const assistantService = new AIAssistantService({
      providerType: 'openai',
      openai: {
        apiKey: process.env.OPENAI_API_KEY,
        model: process.env.OPENAI_MODEL || 'gpt-4'
      }
    });
    
    // Get conversation history
    const history = await assistantService.getConversationHistory(user.id, 20);
    
    // Format history for the frontend
    const formattedHistory = history.map((message, index) => ({
      id: `history-${index}`,
      role: message.role,
      content: message.content
    }));
    
    // If there's no history, add a welcome message
    if (formattedHistory.length === 0) {
      formattedHistory.push({
        id: 'welcome',
        role: 'assistant',
        content: 'Hello! I\'m your Sturij Furniture Design assistant. How can I help you today?'
      });
    }
    
    return res.status(200).json({
      messages: formattedHistory
    });
  } catch (error) {
    console.error('Error in AI history endpoint:', error);
    return res.status(500).json({
      error: 'An error occurred while retrieving conversation history',
      messages: [{
        id: 'welcome',
        role: 'assistant',
        content: 'Hello! I\'m your Sturij Furniture Design assistant. How can I help you today?'
      }]
    });
  }
}

/**
 * Get the authenticated user from the request
 */
async function getUser(req) {
  const { supabaseClient } = require('../../../lib/supabaseClient');
  
  try {
    // Get the user's session from the request
    const { data: { session }, error } = await supabaseClient.auth.getSession();
    
    if (error || !session) {
      return { user: null };
    }
    
    return { user: session.user };
  } catch (error) {
    console.error('Error getting user:', error);
    return { user: null };
  }
}
