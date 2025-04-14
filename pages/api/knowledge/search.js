// pages/api/knowledge/search.js
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { query, limit = 10 } = req.query;
    
    if (!query || query.trim() === '') {
      return res.status(400).json({ error: 'Search query is required' });
    }
    
    // Search in articles
    const { data: articles, error: articlesError } = await supabase
      .from('knowledge_articles')
      .select(`
        id,
        title,
        excerpt,
        slug,
        is_published,
        category:category_id(id, name, slug)
      `)
      .or(`title.ilike.%${query}%,content.ilike.%${query}%,excerpt.ilike.%${query}%`)
      .eq('is_published', true)
      .order('view_count', { ascending: false })
      .limit(limit);
    
    if (articlesError) {
      throw articlesError;
    }
    
    // Search in categories
    const { data: categories, error: categoriesError } = await supabase
      .from('knowledge_categories')
      .select(`
        id,
        name,
        description,
        slug
      `)
      .or(`name.ilike.%${query}%,description.ilike.%${query}%`)
      .eq('is_active', true)
      .limit(5);
    
    if (categoriesError) {
      throw categoriesError;
    }
    
    // Search in tags
    const { data: tags, error: tagsError } = await supabase
      .from('knowledge_tags')
      .select(`
        id,
        name,
        slug
      `)
      .ilike('name', `%${query}%`)
      .limit(5);
    
    if (tagsError) {
      throw tagsError;
    }
    
    // Log search query for analytics
    await supabase
      .from('knowledge_search_logs')
      .insert([
        {
          query,
          results_count: articles.length + categories.length + tags.length,
          user_id: req.headers.authorization ? (await supabase.auth.getUser(req.headers.authorization.split(' ')[1])).user?.id : null,
          ip_address: req.headers['x-forwarded-for'] || req.socket.remoteAddress
        }
      ]);
    
    return res.status(200).json({
      results: {
        articles,
        categories,
        tags
      },
      meta: {
        total: articles.length + categories.length + tags.length,
        query
      }
    });
  } catch (error) {
    console.error('Error searching knowledge base:', error);
    return res.status(500).json({ error: 'Failed to search knowledge base' });
  }
}
