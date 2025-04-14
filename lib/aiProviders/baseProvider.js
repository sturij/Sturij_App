/**
 * Base AI Provider Interface
 * 
 * This abstract class defines the interface that all AI providers must implement.
 * It allows for easy swapping between different AI providers (OpenAI, Manus, etc.)
 * while maintaining consistent functionality.
 */

class BaseAIProvider {
  /**
   * Generate a response from the AI based on the conversation history
   * 
   * @param {Object} params - Parameters for generating a response
   * @param {Array} params.messages - Array of message objects with role and content
   * @param {Object} params.context - Additional context information (knowledge base, booking data)
   * @param {Array} params.functions - Available functions that the AI can call
   * @returns {Promise<Object>} - The AI response
   */
  async generateResponse(params) {
    throw new Error('Method generateResponse() must be implemented by subclass');
  }

  /**
   * Generate embeddings for text to use in knowledge base searches
   * 
   * @param {string} text - The text to generate embeddings for
   * @returns {Promise<Array<number>>} - Vector representation of the text
   */
  async generateEmbeddings(text) {
    throw new Error('Method generateEmbeddings() must be implemented by subclass');
  }

  /**
   * Calculate similarity between two embedding vectors
   * 
   * @param {Array<number>} embedding1 - First embedding vector
   * @param {Array<number>} embedding2 - Second embedding vector
   * @returns {number} - Similarity score (0-1)
   */
  calculateSimilarity(embedding1, embedding2) {
    // Default implementation using cosine similarity
    if (!embedding1 || !embedding2 || embedding1.length !== embedding2.length) {
      return 0;
    }

    let dotProduct = 0;
    let magnitude1 = 0;
    let magnitude2 = 0;

    for (let i = 0; i < embedding1.length; i++) {
      dotProduct += embedding1[i] * embedding2[i];
      magnitude1 += embedding1[i] * embedding1[i];
      magnitude2 += embedding2[i] * embedding2[i];
    }

    magnitude1 = Math.sqrt(magnitude1);
    magnitude2 = Math.sqrt(magnitude2);

    if (magnitude1 === 0 || magnitude2 === 0) {
      return 0;
    }

    return dotProduct / (magnitude1 * magnitude2);
  }

  /**
   * Process function calls from the AI response
   * 
   * @param {Object} aiResponse - The response from the AI
   * @param {Object} availableFunctions - Map of available functions
   * @returns {Promise<Object>} - Processed response with function results
   */
  async processFunctionCalls(aiResponse, availableFunctions) {
    throw new Error('Method processFunctionCalls() must be implemented by subclass');
  }
}

module.exports = BaseAIProvider;
