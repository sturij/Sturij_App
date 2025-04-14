// pages/api/knowledge/categories.js
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(req, res) {
  // Handle different HTTP methods
  switch (req.method) {
    case 'GET':
      return getCategories(req, res);
    case 'POST':
      return createCategory(req, res);
    default:
      return res.status(405).json({ error: 'Method not allowed' });
  }
}

// Get categories with optional filtering
async function getCategories(req, res) {
  try {
    const { parent, active, sort_by = 'display_order', sort_order = 'asc' } = req.query;
    
    // Start building the query
    let query = supabase
      .from('knowledge_categories')
      .select(`
        *,
        parent:parent_id(id, name, slug),
        article_count:knowledge_articles(count)
      `);
    
    // Apply filters
    if (parent === 'null') {
      query = query.is('parent_id', null);
    } else if (parent) {
      const parentQuery = supabase
        .from('knowledge_categories')
        .select('id')
        .eq('slug', parent)
        .single();
      
      const { data: parentData, error: parentError } = await parentQuery;
      
      if (!parentError && parentData) {
        query = query.eq('parent_id', parentData.id);
      }
    }
    
    if (active === 'true') {
      query = query.eq('is_active', true);
    } else if (active === 'false') {
      query = query.eq('is_active', false);
    }
    
    // Apply sorting
    query = query.order(sort_by, { ascending: sort_order === 'asc' });
    
    // Execute the query
    const { data, error } = await query;
    
    if (error) {
      throw error;
    }
    
    return res.status(200).json({ categories: data });
  } catch (error) {
    console.error('Error fetching categories:', error);
    return res.status(500).json({ error: 'Failed to fetch categories' });
  }
}

// Create a new category
async function createCategory(req, res) {
  try {
    // Check if user is admin
    const { user } = await supabase.auth.getUser(req.headers.authorization?.split(' ')[1]);
    
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('is_admin')
      .eq('id', user.id)
      .single();
    
    if (userError || !userData.is_admin) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    
    const { 
      name, 
      description, 
      icon, 
      parent_id, 
      display_order = 0, 
      is_active = true 
    } = req.body;
    
    // Validate required fields
    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }
    
    // Create category
    const { data: category, error: categoryError } = await supabase
      .from('knowledge_categories')
      .insert([
        {
          name,
          description,
          icon,
          parent_id,
          display_order,
          is_active,
          created_by: user.id,
          updated_by: user.id
        }
      ])
      .select()
      .single();
    
    if (categoryError) {
      throw categoryError;
    }
    
    return res.status(201).json({ category });
  } catch (error) {
    console.error('Error creating category:', error);
    return res.status(500).json({ error: 'Failed to create category' });
  }
}
