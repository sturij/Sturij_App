import { AIAssistantService } from '../../../lib/aiAssistantService';

/**
 * AI Chat API Endpoint
 * 
 * This endpoint handles chat interactions with the AI assistant.
 * It processes user messages, retrieves context-aware responses,
 * and returns AI-generated replies along with suggested follow-up questions.
 */
export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { message, path } = req.body;
    
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }
    
    // Get user from session
    const { user } = await getUser(req);
    
    // Initialize AI assistant service
    const assistantService = new AIAssistantService({
      providerType: 'openai',
      openai: {
        apiKey: process.env.OPENAI_API_KEY,
        model: process.env.OPENAI_MODEL || 'gpt-4'
      }
    });
    
    // Get conversation history if user is authenticated
    let history = [];
    if (user) {
      history = await assistantService.getConversationHistory(user.id);
    }
    
    // Add current page path to message for context
    const messageWithContext = path 
      ? `${message} (I'm currently on the page: ${path})`
      : message;
    
    // Process the message
    const response = await assistantService.processMessage({
      message: messageWithContext,
      history,
      user
    });
    
    // Generate suggested follow-up questions based on the conversation
    const suggestedQuestions = await generateSuggestedQuestions(
      message, 
      response.content,
      path
    );
    
    return res.status(200).json({
      message: response,
      suggestedQuestions
    });
  } catch (error) {
    console.error('Error in AI chat endpoint:', error);
    return res.status(500).json({
      error: 'An error occurred while processing your message',
      message: {
        role: 'assistant',
        content: 'I apologize, but I encountered an error processing your request. Please try again later.'
      }
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

/**
 * Generate suggested follow-up questions based on the conversation
 */
async function generateSuggestedQuestions(userMessage, assistantResponse, currentPath) {
  // Default suggested questions based on common topics
  const defaultSuggestions = [
    'What furniture design services do you offer?',
    'How do I book a consultation?',
    'What are your available appointment times?',
    'Can you help me with custom furniture design?'
  ];
  
  try {
    // If we have OpenAI API access, we can generate dynamic suggestions
    if (process.env.OPENAI_API_KEY) {
      const { OpenAI } = require('openai');
      
      const openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });
      
      const response = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo', // Use a smaller model for cost efficiency
        messages: [
          {
            role: 'system',
            content: `You are a helpful assistant for a furniture design company. 
            Based on the user's message and your response, suggest 3-4 natural follow-up questions 
            the user might want to ask next. Keep suggestions brief and directly related to the conversation.
            Format your response as a JSON array of strings.`
          },
          { role: 'user', content: userMessage },
          { role: 'assistant', content: assistantResponse },
          { 
            role: 'user', 
            content: 'Generate 3-4 follow-up questions as a JSON array of strings.' 
          }
        ],
        temperature: 0.7,
        max_tokens: 150
      });
      
      try {
        // Try to parse the response as JSON
        const content = response.choices[0].message.content.trim();
        // Extract JSON array if wrapped in code blocks or extra text
        const jsonMatch = content.match(/\[[\s\S]*\]/);
        
        if (jsonMatch) {
          const suggestions = JSON.parse(jsonMatch[0]);
          if (Array.isArray(suggestions) && suggestions.length > 0) {
            return suggestions;
          }
        }
      } catch (parseError) {
        console.error('Error parsing suggested questions:', parseError);
      }
    }
    
    // Context-specific default suggestions based on current path
    if (currentPath) {
      if (currentPath.includes('/calendar') || currentPath.includes('/booking')) {
        return [
          'What times are available next week?',
          'How long is a typical consultation?',
          'Can I reschedule my appointment?',
          'What should I prepare for my consultation?'
        ];
      }
      
      if (currentPath.includes('/knowledge') || currentPath.includes('/faq')) {
        return [
          'What materials do you work with?',
          'How long does a custom furniture project take?',
          'Do you offer delivery services?',
          'Can I see examples of your previous work?'
        ];
      }
    }
    
    // Fall back to default suggestions
    return defaultSuggestions;
  } catch (error) {
    console.error('Error generating suggested questions:', error);
    return defaultSuggestions;
  }
}
