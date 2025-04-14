// pages/api/knowledge/tags.js
import { supabase } from '../../../lib/supabaseClient';

/**
 * API endpoint for managing knowledge tags
 * 
 * GET: List all tags with usage statistics
 * POST: Create a new tag (admin only)
 */
export default async function handler(req, res) {
  // Check authentication
  const { data: { session }, error: authError } = await supabase.auth.getSession();
  
  if (authError) {
    console.error('Authentication error:', authError);
    return res.status(500).json({ error: 'Authentication service error' });
  }

  switch (req.method) {
    case 'GET':
      return getTags(req, res, session);
    case 'POST':
      return createTag(req, res, session);
    default:
      return res.status(405).json({ error: 'Method not allowed' });
  }
}

/**
 * Get all tags with usage statistics
 */
async function getTags(req, res, session) {
  try {
    // Get all tags
    const { data: tags, error } = await supabase
      .from('knowledge_tags')
      .select('*')
      .order('name', { ascending: true });
    
    if (error) {
      throw error;
    }
    
    // Get usage statistics for each tag
    const tagsWithUsage = await Promise.all(tags.map(async (tag) => {
      const { count, error: countError } = await supabase
        .from('knowledge_article_tags')
        .select('article_id', { count: 'exact' })
        .eq('tag_id', tag.id);
      
      return {
        ...tag,
        usage_count: countError ? 0 : count
      };
    }));
    
    return res.status(200).json({ tags: tagsWithUsage });
  } catch (error) {
    console.error('Error getting tags:', error);
    return res.status(500).json({ error: 'Failed to get tags' });
  }
}

/**
 * Create a new tag (admin only)
 * 
 * Required fields:
 * - name: Tag name
 * 
 * Optional fields:
 * - slug: Custom slug (generated from name if not provided)
 */
async function createTag(req, res, session) {
  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  try {
    // Check if user is admin
    const isAdmin = await checkIfAdmin(session.user.id);
    if (!isAdmin) {
      return res.status(403).json({ error: 'Forbidden: Admin access required' });
    }
    
    const { name, slug } = req.body;
    
    // Validate required fields
    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }
    
    // Create the tag
    const { data: tag, error } = await supabase
      .from('knowledge_tags')
      .insert([
        {
          name,
          slug
        }
      ])
      .select()
      .single();
    
    if (error) {
      throw error;
    }
    
    return res.status(201).json({ tag });
  } catch (error) {
    console.error('Error creating tag:', error);
    return res.status(500).json({ error: 'Failed to create tag' });
  }
}

/**
 * Check if a user is an admin
 * @param {string} userId - The user ID to check
 * @returns {Promise<boolean>} - True if user is admin, false otherwise
 */
async function checkIfAdmin(userId) {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', userId)
      .single();
    
    if (error || !data) {
      return false;
    }
    
    return data.is_admin === true;
  } catch (error) {
    console.error('Error checking admin status:', error);
    return false;
  }
}
