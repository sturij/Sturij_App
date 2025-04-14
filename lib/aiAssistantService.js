/**
 * AI Assistant Service
 * 
 * This service manages the AI assistant functionality, including:
 * - Provider selection and initialization
 * - Context gathering from knowledge base and booking system
 * - Conversation history management
 * - Function registration and execution
 */

const OpenAIProvider = require('./aiProviders/openaiProvider');
const { supabaseClient } = require('./supabaseClient');

class AIAssistantService {
  constructor(config = {}) {
    this.providerType = config.providerType || 'openai';
    this.provider = this.initializeProvider(config);
    this.functions = this.registerFunctions();
  }

  /**
   * Initialize the appropriate AI provider based on configuration
   * 
   * @param {Object} config - Configuration options
   * @returns {BaseAIProvider} - Initialized AI provider
   */
  initializeProvider(config) {
    switch (this.providerType) {
      case 'openai':
        return new OpenAIProvider(config.openai || {});
      // Add more providers here as they become available
      // case 'manus':
      //   return new ManusProvider(config.manus || {});
      default:
        throw new Error(`Unsupported AI provider type: ${this.providerType}`);
    }
  }

  /**
   * Register available functions that the AI can call
   * 
   * @returns {Object} - Map of function names to implementations
   */
  registerFunctions() {
    return {
      check_availability: this.checkAvailability.bind(this),
      get_knowledge_article: this.getKnowledgeArticle.bind(this),
      create_booking: this.createBooking.bind(this),
      get_user_bookings: this.getUserBookings.bind(this),
    };
  }

  /**
   * Get function definitions for the AI provider
   * 
   * @returns {Array} - Array of function definitions
   */
  getFunctionDefinitions() {
    return [
      {
        name: "check_availability",
        description: "Check available appointment slots for a specific date",
        parameters: {
          type: "object",
          properties: {
            date: {
              type: "string",
              description: "The date to check in YYYY-MM-DD format"
            }
          },
          required: ["date"]
        }
      },
      {
        name: "get_knowledge_article",
        description: "Retrieve a specific knowledge base article by slug or search for articles by query",
        parameters: {
          type: "object",
          properties: {
            slug: {
              type: "string",
              description: "The slug of the article to retrieve"
            },
            query: {
              type: "string",
              description: "Search query to find relevant articles"
            }
          }
        }
      },
      {
        name: "create_booking",
        description: "Create a new booking appointment",
        parameters: {
          type: "object",
          properties: {
            date: {
              type: "string",
              description: "The date for the appointment in YYYY-MM-DD format"
            },
            time: {
              type: "string",
              description: "The time for the appointment in HH:MM format"
            },
            name: {
              type: "string",
              description: "Customer name"
            },
            email: {
              type: "string",
              description: "Customer email"
            },
            phone: {
              type: "string",
              description: "Customer phone number"
            },
            purpose: {
              type: "string",
              description: "Purpose of the appointment"
            },
            notes: {
              type: "string",
              description: "Additional notes for the appointment"
            }
          },
          required: ["date", "time", "name", "email"]
        }
      },
      {
        name: "get_user_bookings",
        description: "Retrieve a user's bookings",
        parameters: {
          type: "object",
          properties: {
            email: {
              type: "string",
              description: "User's email address"
            },
            type: {
              type: "string",
              enum: ["upcoming", "past", "all"],
              description: "Type of bookings to retrieve"
            }
          },
          required: ["email"]
        }
      }
    ];
  }

  /**
   * Process a user message and generate a response
   * 
   * @param {Object} params - Parameters for processing the message
   * @param {string} params.message - User message text
   * @param {Array} params.history - Conversation history
   * @param {Object} params.user - User information
   * @returns {Promise<Object>} - AI response
   */
  async processMessage({ message, history = [], user = {} }) {
    try {
      // Gather context from knowledge base and booking system
      const context = await this.gatherContext(message, user);
      
      // Format conversation history for the provider
      const formattedHistory = this.formatConversationHistory(history);
      
      // Add the current message
      formattedHistory.push({
        role: 'user',
        content: message
      });
      
      // Get function definitions
      const functions = this.getFunctionDefinitions();
      
      // Generate response from AI provider
      const aiResponse = await this.provider.generateResponse({
        messages: formattedHistory,
        context,
        functions
      });
      
      // Process any function calls in the response
      const processedResponse = await this.provider.processFunctionCalls(
        aiResponse,
        this.functions
      );
      
      // Save the conversation to history
      await this.saveConversationHistory(user.id, {
        role: 'user',
        content: message
      }, processedResponse);
      
      return processedResponse;
    } catch (error) {
      console.error('Error processing message:', error);
      return {
        role: 'assistant',
        content: 'I apologize, but I encountered an error processing your request. Please try again later.'
      };
    }
  }

  /**
   * Gather context information from knowledge base and booking system
   * 
   * @param {string} message - User message
   * @param {Object} user - User information
   * @returns {Promise<Object>} - Context information
   */
  async gatherContext(message, user) {
    const context = {
      knowledgeBase: [],
      bookings: {},
      user
    };
    
    try {
      // Get relevant knowledge base articles
      context.knowledgeBase = await this.searchKnowledgeBase(message);
      
      // Get user's bookings if authenticated
      if (user && user.id) {
        const upcomingBookings = await this.getUserUpcomingBookings(user.id);
        if (upcomingBookings.length > 0) {
          context.bookings.upcoming = upcomingBookings;
        }
        
        // Get availability for next 7 days
        context.bookings.availability = await this.getAvailabilityForNextDays(7);
      }
    } catch (error) {
      console.error('Error gathering context:', error);
    }
    
    return context;
  }

  /**
   * Search the knowledge base for relevant articles
   * 
   * @param {string} query - Search query
   * @returns {Promise<Array>} - Relevant articles
   */
  async searchKnowledgeBase(query) {
    try {
      // Generate embeddings for the query
      const queryEmbedding = await this.provider.generateEmbeddings(query);
      
      // Get all published articles from the knowledge base
      const { data: articles, error } = await supabaseClient
        .from('knowledge_articles')
        .select('id, title, slug, excerpt, content, category_id, meta_description')
        .eq('is_published', true);
      
      if (error) {
        throw error;
      }
      
      if (!articles || articles.length === 0) {
        return [];
      }
      
      // For each article, generate embeddings and calculate similarity
      const articlesWithSimilarity = await Promise.all(
        articles.map(async (article) => {
          try {
            // Use title and excerpt for embedding to save tokens
            const textToEmbed = `${article.title}. ${article.excerpt || article.meta_description || ''}`;
            const embedding = await this.provider.generateEmbeddings(textToEmbed);
            const similarity = this.provider.calculateSimilarity(queryEmbedding, embedding);
            
            return {
              ...article,
              similarity
            };
          } catch (error) {
            console.error(`Error processing article ${article.id}:`, error);
            return {
              ...article,
              similarity: 0
            };
          }
        })
      );
      
      // Sort by similarity and take top 3
      const relevantArticles = articlesWithSimilarity
        .sort((a, b) => b.similarity - a.similarity)
        .filter(article => article.similarity > 0.7) // Only include if similarity is above threshold
        .slice(0, 3);
      
      return relevantArticles;
    } catch (error) {
      console.error('Error searching knowledge base:', error);
      return [];
    }
  }

  /**
   * Get user's upcoming bookings
   * 
   * @param {string} userId - User ID
   * @returns {Promise<Array>} - Upcoming bookings
   */
  async getUserUpcomingBookings(userId) {
    try {
      const today = new Date().toISOString().split('T')[0];
      
      const { data: bookings, error } = await supabaseClient
        .from('bookings')
        .select('*')
        .eq('user_id', userId)
        .gte('date', today)
        .neq('status', 'cancelled')
        .order('date', { ascending: true })
        .order('time', { ascending: true });
      
      if (error) {
        throw error;
      }
      
      return bookings || [];
    } catch (error) {
      console.error('Error getting user bookings:', error);
      return [];
    }
  }

  /**
   * Get availability for the next N days
   * 
   * @param {number} days - Number of days to check
   * @returns {Promise<Object>} - Availability by date
   */
  async getAvailabilityForNextDays(days) {
    try {
      const availability = {};
      const today = new Date();
      
      for (let i = 0; i < days; i++) {
        const date = new Date(today);
        date.setDate(today.getDate() + i);
        const dateString = date.toISOString().split('T')[0];
        
        // Call the database function to get available slots
        const { data, error } = await supabaseClient.rpc(
          'get_available_time_slots',
          { check_date: dateString }
        );
        
        if (error) {
          throw error;
        }
        
        if (data && data.length > 0) {
          // Format times to HH:MM format
          availability[dateString] = data.map(slot => {
            const timeStr = slot.available_time;
            return timeStr.substring(0, 5); // Extract HH:MM from time string
          });
        }
      }
      
      return availability;
    } catch (error) {
      console.error('Error getting availability:', error);
      return {};
    }
  }

  /**
   * Format conversation history for the AI provider
   * 
   * @param {Array} history - Raw conversation history
   * @returns {Array} - Formatted history
   */
  formatConversationHistory(history) {
    if (!history || history.length === 0) {
      return [];
    }
    
    return history.map(item => ({
      role: item.role,
      content: item.content,
      ...(item.function_call ? { function_call: item.function_call } : {}),
      ...(item.name ? { name: item.name } : {})
    }));
  }

  /**
   * Save conversation to history
   * 
   * @param {string} userId - User ID
   * @param {Object} userMessage - User message
   * @param {Object} assistantResponse - Assistant response
   * @returns {Promise<void>}
   */
  async saveConversationHistory(userId, userMessage, assistantResponse) {
    if (!userId) {
      return; // Don't save if no user ID
    }
    
    try {
      const { error } = await supabaseClient
        .from('conversation_history')
        .insert([
          {
            user_id: userId,
            role: userMessage.role,
            content: userMessage.content,
            timestamp: new Date().toISOString()
          },
          {
            user_id: userId,
            role: assistantResponse.role,
            content: assistantResponse.content,
            function_call: assistantResponse.function_call ? JSON.stringify(assistantResponse.function_call) : null,
            name: assistantResponse.name || null,
            timestamp: new Date().toISOString()
          }
        ]);
      
      if (error) {
        throw error;
      }
    } catch (error) {
      console.error('Error saving conversation history:', error);
    }
  }

  /**
   * Get conversation history for a user
   * 
   * @param {string} userId - User ID
   * @param {number} limit - Maximum number of messages to retrieve
   * @returns {Promise<Array>} - Conversation history
   */
  async getConversationHistory(userId, limit = 20) {
    if (!userId) {
      return [];
    }
    
    try {
      const { data, error } = await supabaseClient
        .from('conversation_history')
        .select('*')
        .eq('user_id', userId)
        .order('timestamp', { ascending: false })
        .limit(limit);
      
      if (error) {
        throw error;
      }
      
      // Reverse to get chronological order and parse function_call if present
      return (data || [])
        .reverse()
        .map(item => ({
          role: item.role,
          content: item.content,
          ...(item.function_call ? { function_call: JSON.parse(item.function_call) } : {}),
          ...(item.name ? { name: item.name } : {}),
          timestamp: item.timestamp
        }));
    } catch (error) {
      console.error('Error getting conversation history:', error);
      return [];
    }
  }

  // Function implementations for AI to call

  /**
   * Check availability for a specific date
   * 
   * @param {Object} params - Function parameters
   * @param {string} params.date - Date to check in YYYY-MM-DD format
   * @returns {Promise<Object>} - Available time slots
   */
  async checkAvailability({ date }) {
    try {
      // Call the database function to get available slots
      const { data, error } = await supabaseClient.rpc(
        'get_available_time_slots',
        { check_date: date }
      );
      
      if (error) {
        throw error;
      }
      
      // Format times to HH:MM format
      const availableSlots = (data || []).map(slot => {
        const timeStr = slot.available_time;
        return timeStr.substring(0, 5); // Extract HH:MM from time string
      });
      
      return {
        date,
        available_slots: availableSlots,
        has_availability: availableSlots.length > 0
      };
    } catch (error) {
      console.error('Error checking availability:', error);
      throw new Error(`Failed to check availability: ${error.message}`);
    }
  }

  /**
   * Get a knowledge base article by slug or search for articles
   * 
   * @param {Object} params - Function parameters
   * @param {string} params.slug - Article slug
   * @param {string} params.query - Search query
   * @returns {Promise<Object>} - Article or search results
   */
  async getKnowledgeArticle({ slug, query }) {
    try {
      if (slug) {
        // Get specific article by slug
        const { data, error } = await supabaseClient
          .from('knowledge_articles')
          .select(`
            id, title, slug, content, excerpt, meta_description,
            knowledge_categories(id, name, slug)
          `)
          .eq('slug', slug)
          .eq('is_published', true)
          .single();
        
        if (error) {
          throw error;
        }
        
        if (!data) {
          return { error: 'Article not found' };
        }
        
        return {
          article: {
            id: data.id,
            title: data.title,
            slug: data.slug,
            content: data.content,
            excerpt: data.excerpt || data.meta_description,
            category: data.knowledge_categories ? {
              id: data.knowledge_categories.id,
              name: data.knowledge_categories.name,
              slug: data.knowledge_categories.slug
            } : null
          }
        };
      } else if (query) {
        // Search for articles
        const articles = await this.searchKnowledgeBase(query);
        
        return {
          query,
          results: articles.map(article => ({
            id: article.id,
            title: article.title,
            slug: article.slug,
            excerpt: article.excerpt || article.meta_description,
            similarity: article.similarity
          }))
        };
      } else {
        return { error: 'Either slug or query parameter is required' };
      }
    } catch (error) {
      console.error('Error getting knowledge article:', error);
      throw new Error(`Failed to get knowledge article: ${error.message}`);
    }
  }

  /**
   * Create a new booking
   * 
   * @param {Object} params - Booking details
   * @returns {Promise<Object>} - Created booking
   */
  async createBooking(params) {
    try {
      // Check if the time slot is available
      const isAvailable = await this.isTimeSlotAvailable(params.date, params.time);
      
      if (!isAvailable) {
        return {
          success: false,
          error: 'The selected time slot is not available'
        };
      }
      
      // Find or create user
      let userId = null;
      
      // Check if user exists
      const { data: existingUser, error: userError } = await supabaseClient
        .from('users')
        .select('id')
        .eq('email', params.email)
        .single();
      
      if (userError && userError.code !== 'PGRST116') { // PGRST116 is "not found"
        throw userError;
      }
      
      if (existingUser) {
        userId = existingUser.id;
      } else {
        // Create anonymous user record
        // In a real implementation, you might want to handle this differently
        // or require authentication before booking
        const { data: newUser, error: createError } = await supabaseClient
          .from('users')
          .insert({
            email: params.email,
            name: params.name,
            auth_method: 'anonymous'
          })
          .select('id')
          .single();
        
        if (createError) {
          throw createError;
        }
        
        userId = newUser.id;
      }
      
      // Create the booking
      const { data: booking, error } = await supabaseClient
        .from('bookings')
        .insert({
          user_id: userId,
          date: params.date,
          time: params.time,
          name: params.name,
          email: params.email,
          phone: params.phone || null,
          purpose: params.purpose || 'Consultation',
          notes: params.notes || null,
          status: 'confirmed'
        })
        .select('*')
        .single();
      
      if (error) {
        throw error;
      }
      
      return {
        success: true,
        booking: {
          id: booking.id,
          date: booking.date,
          time: booking.time,
          name: booking.name,
          email: booking.email,
          purpose: booking.purpose,
          status: booking.status
        }
      };
    } catch (error) {
      console.error('Error creating booking:', error);
      throw new Error(`Failed to create booking: ${error.message}`);
    }
  }

  /**
   * Check if a time slot is available
   * 
   * @param {string} date - Date in YYYY-MM-DD format
   * @param {string} time - Time in HH:MM format
   * @returns {Promise<boolean>} - Whether the time slot is available
   */
  async isTimeSlotAvailable(date, time) {
    try {
      // Call the database function to check if slot is available
      const { data, error } = await supabaseClient.rpc(
        'is_time_slot_available',
        { 
          check_date: date,
          check_time: `${time}:00` // Add seconds for proper time format
        }
      );
      
      if (error) {
        throw error;
      }
      
      return data || false;
    } catch (error) {
      console.error('Error checking time slot availability:', error);
      return false;
    }
  }

  /**
   * Get a user's bookings
   * 
   * @param {Object} params - Function parameters
   * @param {string} params.email - User's email
   * @param {string} params.type - Type of bookings to retrieve (upcoming, past, all)
   * @returns {Promise<Object>} - User's bookings
   */
  async getUserBookings({ email, type = 'upcoming' }) {
    try {
      // Find user by email
      const { data: user, error: userError } = await supabaseClient
        .from('users')
        .select('id')
        .eq('email', email)
        .single();
      
      if (userError) {
        if (userError.code === 'PGRST116') { // Not found
          return {
            email,
            bookings: []
          };
        }
        throw userError;
      }
      
      // Build query for bookings
      let query = supabaseClient
        .from('bookings')
        .select('*')
        .eq('user_id', user.id);
      
      const today = new Date().toISOString().split('T')[0];
      
      // Filter by type
      if (type === 'upcoming') {
        query = query
          .gte('date', today)
          .neq('status', 'cancelled');
      } else if (type === 'past') {
        query = query
          .lt('date', today);
      }
      
      // Order by date and time
      query = query
        .order('date', { ascending: type === 'upcoming' })
        .order('time', { ascending: true });
      
      const { data: bookings, error } = await query;
      
      if (error) {
        throw error;
      }
      
      return {
        email,
        bookings: (bookings || []).map(booking => ({
          id: booking.id,
          date: booking.date,
          time: booking.time,
          purpose: booking.purpose,
          status: booking.status,
          notes: booking.notes
        }))
      };
    } catch (error) {
      console.error('Error getting user bookings:', error);
      throw new Error(`Failed to get user bookings: ${error.message}`);
    }
  }
}

module.exports = AIAssistantService;
