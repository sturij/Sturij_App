/**
 * OpenAI Provider Implementation
 * 
 * This class implements the BaseAIProvider interface for OpenAI.
 * It handles communication with the OpenAI API for generating responses,
 * creating embeddings, and processing function calls.
 */

const { OpenAI } = require('openai');
const BaseAIProvider = require('./baseProvider');

class OpenAIProvider extends BaseAIProvider {
  constructor(config = {}) {
    super();
    this.apiKey = config.apiKey || process.env.OPENAI_API_KEY;
    this.model = config.model || 'gpt-4';
    this.embeddingModel = config.embeddingModel || 'text-embedding-ada-002';
    
    if (!this.apiKey) {
      throw new Error('OpenAI API key is required');
    }
    
    this.client = new OpenAI({
      apiKey: this.apiKey,
    });
  }

  /**
   * Generate a response from OpenAI based on the conversation history
   * 
   * @param {Object} params - Parameters for generating a response
   * @param {Array} params.messages - Array of message objects with role and content
   * @param {Object} params.context - Additional context information (knowledge base, booking data)
   * @param {Array} params.functions - Available functions that the AI can call
   * @returns {Promise<Object>} - The OpenAI response
   */
  async generateResponse({ messages, context = {}, functions = [] }) {
    try {
      // Prepare system message with context
      const systemMessage = this.prepareSystemMessage(context);
      
      // Combine system message with conversation history
      const fullMessages = [
        systemMessage,
        ...messages
      ];
      
      // Prepare request parameters
      const requestParams = {
        model: this.model,
        messages: fullMessages,
      };
      
      // Add functions if provided
      if (functions && functions.length > 0) {
        requestParams.functions = functions;
        requestParams.function_call = 'auto';
      }
      
      // Make API call to OpenAI
      const response = await this.client.chat.completions.create(requestParams);
      
      return response.choices[0].message;
    } catch (error) {
      console.error('Error generating response from OpenAI:', error);
      throw new Error(`Failed to generate response: ${error.message}`);
    }
  }

  /**
   * Generate embeddings for text using OpenAI's embedding API
   * 
   * @param {string} text - The text to generate embeddings for
   * @returns {Promise<Array<number>>} - Vector representation of the text
   */
  async generateEmbeddings(text) {
    try {
      const response = await this.client.embeddings.create({
        model: this.embeddingModel,
        input: text,
      });
      
      return response.data[0].embedding;
    } catch (error) {
      console.error('Error generating embeddings from OpenAI:', error);
      throw new Error(`Failed to generate embeddings: ${error.message}`);
    }
  }

  /**
   * Process function calls from the OpenAI response
   * 
   * @param {Object} aiResponse - The response from OpenAI
   * @param {Object} availableFunctions - Map of available functions
   * @returns {Promise<Object>} - Processed response with function results
   */
  async processFunctionCalls(aiResponse, availableFunctions) {
    // Check if the response contains a function call
    if (aiResponse.function_call) {
      const functionName = aiResponse.function_call.name;
      let functionArgs = {};
      
      try {
        functionArgs = JSON.parse(aiResponse.function_call.arguments);
      } catch (error) {
        console.error('Error parsing function arguments:', error);
        return {
          role: 'assistant',
          content: 'I encountered an error processing your request. Please try again.'
        };
      }
      
      // Check if the function exists
      if (availableFunctions[functionName]) {
        try {
          // Execute the function
          const functionResult = await availableFunctions[functionName](functionArgs);
          
          // Return the function result to the model for further processing
          const followUpResponse = await this.client.chat.completions.create({
            model: this.model,
            messages: [
              { role: 'assistant', content: null, function_call: aiResponse.function_call },
              { role: 'function', name: functionName, content: JSON.stringify(functionResult) }
            ],
          });
          
          return followUpResponse.choices[0].message;
        } catch (error) {
          console.error(`Error executing function ${functionName}:`, error);
          return {
            role: 'assistant',
            content: `I tried to help with that, but encountered an error: ${error.message}`
          };
        }
      } else {
        return {
          role: 'assistant',
          content: `I tried to perform an action (${functionName}), but it's not available right now.`
        };
      }
    }
    
    // If no function call, return the original response
    return aiResponse;
  }

  /**
   * Prepare system message with context information
   * 
   * @param {Object} context - Context information
   * @returns {Object} - System message with context
   */
  prepareSystemMessage(context) {
    let systemContent = `You are an AI assistant for Sturij Furniture Design. 
You help customers with furniture design inquiries and booking appointments.
Be friendly, professional, and helpful. Provide concise but informative responses.
Today's date is ${new Date().toLocaleDateString()}.`;
    
    // Add knowledge base context if available
    if (context.knowledgeBase && context.knowledgeBase.length > 0) {
      systemContent += '\n\nRelevant information from our knowledge base:';
      context.knowledgeBase.forEach(item => {
        systemContent += `\n- ${item.title}: ${item.excerpt}`;
      });
    }
    
    // Add booking context if available
    if (context.bookings) {
      if (context.bookings.upcoming && context.bookings.upcoming.length > 0) {
        systemContent += '\n\nUpcoming appointments:';
        context.bookings.upcoming.forEach(booking => {
          systemContent += `\n- ${new Date(booking.date).toLocaleDateString()} at ${booking.time}: ${booking.purpose || 'Consultation'}`;
        });
      }
      
      if (context.bookings.availability) {
        systemContent += '\n\nNext available appointment slots:';
        Object.entries(context.bookings.availability).forEach(([date, slots]) => {
          systemContent += `\n- ${date}: ${slots.join(', ')}`;
        });
      }
    }
    
    // Add user context if available
    if (context.user) {
      systemContent += '\n\nUser information:';
      if (context.user.name) systemContent += `\n- Name: ${context.user.name}`;
      if (context.user.email) systemContent += `\n- Email: ${context.user.email}`;
      if (context.user.preferences) systemContent += `\n- Preferences: ${context.user.preferences}`;
    }
    
    return { role: 'system', content: systemContent };
  }
}

module.exports = OpenAIProvider;
