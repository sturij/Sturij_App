// pages/api/knowledge/analytics.js
import { supabase } from '../../../lib/supabaseClient';

/**
 * API endpoint for knowledge base analytics
 * 
 * GET: Get analytics data including total articles, views, and popular articles
 */
export default async function handler(req, res) {
  // Check authentication
  const { data: { session }, error: authError } = await supabase.auth.getSession();
  
  if (authError) {
    console.error('Authentication error:', authError);
    return res.status(500).json({ error: 'Authentication service error' });
  }

  // Only allow GET method
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Check if user is admin
  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const isAdmin = await checkIfAdmin(session.user.id);
  if (!isAdmin) {
    return res.status(403).json({ error: 'Forbidden: Admin access required' });
  }

  try {
    // Get total articles count
    const { count: totalArticles, error: articlesError } = await supabase
      .from('knowledge_articles')
      .select('id', { count: 'exact' });
    
    if (articlesError) {
      throw articlesError;
    }

    // Get total views count
    const { count: totalViews, error: viewsError } = await supabase
      .from('knowledge_article_views')
      .select('id', { count: 'exact' });
    
    if (viewsError) {
      throw viewsError;
    }

    // Calculate average views per article
    const averageViews = totalArticles > 0 ? totalViews / totalArticles : 0;

    // Get popular articles (top 10 by view count)
    const { data: popularArticles, error: popularError } = await supabase
      .from('knowledge_articles')
      .select(`
        id,
        title,
        slug,
        category:category_id(id, name, slug),
        view_count
      `)
      .order('view_count', { ascending: false })
      .limit(10);
    
    if (popularError) {
      throw popularError;
    }

    return res.status(200).json({
      totalArticles,
      totalViews,
      averageViews,
      popularArticles
    });
  } catch (error) {
    console.error('Error getting analytics data:', error);
    return res.status(500).json({ error: 'Failed to get analytics data' });
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
