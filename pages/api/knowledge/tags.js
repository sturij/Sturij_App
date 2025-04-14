// pages/api/knowledge/tags.js
import { supabase } from '../../../lib/supabaseClient';

export default async function handler(req, res) {
  // Handle different HTTP methods
  switch (req.method) {
    case 'GET':
      return getTags(req, res);
    case 'POST':
      return createTag(req, res);
    default:
      return res.status(405).json({ error: 'Method not allowed' });
  }
}

// Get tags with optional filtering
async function getTags(req, res) {
  try {
    const { sort_by = 'name', sort_order = 'asc' } = req.query;

    // Start building the query
    let query = supabase
      .from('knowledge_tags')
      .select(`
        *,
        article_count:knowledge_article_tags(count)
      `);

    // Apply sorting
    query = query.order(sort_by, { ascending: sort_order === 'asc' });

    // Execute the query
    const { data, error } = await query;

    if (error) {
      throw error;
    }

    return res.status(200).json({ tags: data });
  } catch (error) {
    console.error('Error fetching tags:', error);
    return res.status(500).json({ error: 'Failed to fetch tags' });
  }
}

// Create a new tag
async function createTag(req, res) {
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

    const { name } = req.body;

    // Validate required fields
    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }

    // Create tag
    const { data: tag, error: tagError } = await supabase
      .from('knowledge_tags')
      .insert([{ name }])
      .select()
      .single();

    if (tagError) {
      throw tagError;
    }

    return res.status(201).json({ tag });
  } catch (error) {
    console.error('Error creating tag:', error);
    return res.status(500).json({ error: 'Failed to create tag' });
  }
}