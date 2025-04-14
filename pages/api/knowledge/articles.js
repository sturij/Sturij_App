// pages/api/knowledge/articles.js
import { supabase } from '../../../lib/supabaseClient';

/**
 * API endpoint for managing knowledge articles
 * 
 * GET: List articles with filtering and pagination
 * POST: Create a new article (admin only)
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
      return getArticles(req, res, session);
    case 'POST':
      return createArticle(req, res, session);
    default:
      return res.status(405).json({ error: 'Method not allowed' });
  }
}

/**
 * Get articles with filtering and pagination
 * 
 * Query parameters:
 * - category: Filter by category slug
 * - tag: Filter by tag slug
 * - featured: Filter featured articles (true/false)
 * - published: Filter by published status (true/false)
 * - search: Search term for title/content
 * - page: Page number for pagination
 * - limit: Number of items per page
 */
async function getArticles(req, res, session) {
  try {
    const {
      category,
      tag,
      featured,
      published = 'true',
      search,
      page = 1,
      limit = 10
    } = req.query;

    // Start building the query
    let query = supabase
      .from('knowledge_articles')
      .select(`
        *,
        category:category_id(id, name, slug),
        tags:knowledge_article_tags(tag:tag_id(id, name, slug))
      `);

    // Apply filters
    if (category) {
      query = query.eq('category.slug', category);
    }

    if (tag) {
      query = query.eq('tags.tag.slug', tag);
    }

    if (featured) {
      query = query.eq('is_featured', featured === 'true');
    }

    // Only admins can see unpublished articles
    const isAdmin = session?.user ? await checkIfAdmin(session.user.id) : false;
    if (published === 'true' || !isAdmin) {
      query = query.eq('is_published', true);
    } else if (published === 'false' && isAdmin) {
      query = query.eq('is_published', false);
    }

    // Apply search if provided
    if (search) {
      query = query.or(`title.ilike.%${search}%, content.ilike.%${search}%`);
    }

    // Apply pagination
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    
    query = query
      .order('created_at', { ascending: false })
      .range(from, to);

    const { data, error, count } = await query;

    if (error) {
      throw error;
    }

    // Format the response
    const formattedData = data.map(article => {
      return {
        ...article,
        tags: article.tags.map(t => t.tag)
      };
    });

    return res.status(200).json({
      articles: formattedData,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count
      }
    });
  } catch (error) {
    console.error('Error getting articles:', error);
    return res.status(500).json({ error: 'Failed to get articles' });
  }
}

/**
 * Create a new article (admin only)
 * 
 * Required fields:
 * - title: Article title
 * - content: Article content
 * - category_id: Category ID
 * 
 * Optional fields:
 * - slug: Custom slug (generated from title if not provided)
 * - excerpt: Short description
 * - is_published: Publication status
 * - is_featured: Featured status
 * - meta_title: SEO title
 * - meta_description: SEO description
 * - tags: Array of tag IDs
 */
async function createArticle(req, res, session) {
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
      title,
      content,
      slug,
      excerpt,
      category_id,
      is_published = false,
      is_featured = false,
      meta_title,
      meta_description,
      tags = []
    } = req.body;

    // Validate required fields
    if (!title || !content || !category_id) {
      return res.status(400).json({ error: 'Title, content, and category are required' });
    }

    // Create the article
    const { data: article, error } = await supabase
      .from('knowledge_articles')
      .insert([
        {
          title,
          content,
          slug,
          excerpt,
          category_id,
          is_published,
          is_featured,
          meta_title,
          meta_description,
          created_by: session.user.id,
          updated_by: session.user.id
        }
      ])
      .select()
      .single();

    if (error) {
      throw error;
    }

    // Add tags if provided
    if (tags.length > 0) {
      const tagConnections = tags.map(tag_id => ({
        article_id: article.id,
        tag_id
      }));

      const { error: tagError } = await supabase
        .from('knowledge_article_tags')
        .insert(tagConnections);

      if (tagError) {
        console.error('Error adding tags:', tagError);
        // Don't fail the whole request if tag association fails
      }
    }

    // Create initial revision
    const { error: revisionError } = await supabase
      .from('knowledge_article_revisions')
      .insert([
        {
          article_id: article.id,
          title,
          content,
          excerpt,
          revision_number: 1,
          created_by: session.user.id
        }
      ]);

    if (revisionError) {
      console.error('Error creating revision:', revisionError);
      // Don't fail the whole request if revision creation fails
    }

    return res.status(201).json({ article });
  } catch (error) {
    console.error('Error creating article:', error);
    return res.status(500).json({ error: 'Failed to create article' });
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
