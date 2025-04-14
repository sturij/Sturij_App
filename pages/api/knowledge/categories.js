// pages/api/knowledge/categories.js
import { supabase } from '../../../lib/supabaseClient';

/**
 * API endpoint for managing knowledge categories
 * 
 * GET: List categories with optional filtering
 * POST: Create a new category (admin only)
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
      return getCategories(req, res, session);
    case 'POST':
      return createCategory(req, res, session);
    default:
      return res.status(405).json({ error: 'Method not allowed' });
  }
}

/**
 * Get categories with optional filtering
 * 
 * Query parameters:
 * - parent_id: Filter by parent category ID
 * - active: Filter by active status (true/false)
 */
async function getCategories(req, res, session) {
  try {
    const { parent_id, active } = req.query;
    
    // Start building the query
    let query = supabase
      .from('knowledge_categories')
      .select(`
        *,
        parent:parent_id(id, name, slug)
      `);
    
    // Apply filters
    if (parent_id) {
      if (parent_id === 'null') {
        query = query.is('parent_id', null);
      } else {
        query = query.eq('parent_id', parent_id);
      }
    }
    
    if (active) {
      query = query.eq('is_active', active === 'true');
    }
    
    // Order by display_order and name
    query = query.order('display_order', { ascending: true }).order('name', { ascending: true });
    
    const { data, error } = await query;
    
    if (error) {
      throw error;
    }
    
    return res.status(200).json({ categories: data });
  } catch (error) {
    console.error('Error getting categories:', error);
    return res.status(500).json({ error: 'Failed to get categories' });
  }
}

/**
 * Create a new category (admin only)
 * 
 * Required fields:
 * - name: Category name
 * 
 * Optional fields:
 * - slug: Custom slug (generated from name if not provided)
 * - description: Category description
 * - icon: Icon name
 * - parent_id: Parent category ID
 * - is_active: Active status
 * - display_order: Display order
 */
async function createCategory(req, res, session) {
  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  try {
    // Check if user is admin
    const isAdmin = await checkIfAdmin(session.user.id);
    if (!isAdmin) {
      return res.status(403).json({ error: 'Forbidden: Admin access required' });
    }
    
    const {
      name,
      slug,
      description,
      icon,
      parent_id,
      is_active = true,
      display_order = 0
    } = req.body;
    
    // Validate required fields
    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }
    
    // Create the category
    const { data: category, error } = await supabase
      .from('knowledge_categories')
      .insert([
        {
          name,
          slug,
          description,
          icon,
          parent_id,
          is_active,
          display_order,
          created_by: session.user.id,
          updated_by: session.user.id
        }
      ])
      .select()
      .single();
    
    if (error) {
      throw error;
    }
    
    return res.status(201).json({ category });
  } catch (error) {
    console.error('Error creating category:', error);
    return res.status(500).json({ error: 'Failed to create category' });
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
