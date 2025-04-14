// pages/api/knowledge/article/[slug].js
import { supabase } from '../../../../lib/supabaseClient';

/**
 * API endpoint for managing a specific knowledge article by slug
 * 
 * GET: Get a specific article
 * PUT: Update an article (admin only)
 * DELETE: Delete an article (admin only)
 */
export default async function handler(req, res) {
  // Check authentication
  const { data: { session }, error: authError } = await supabase.auth.getSession();
  
  if (authError) {
    console.error('Authentication error:', authError);
    return res.status(500).json({ error: 'Authentication service error' });
  }

  // Get the slug from the URL
  const { slug } = req.query;
  
  if (!slug) {
    return res.status(400).json({ error: 'Slug is required' });
  }

  switch (req.method) {
    case 'GET':
      return getArticle(req, res, session, slug);
    case 'PUT':
      return updateArticle(req, res, session, slug);
    case 'DELETE':
      return deleteArticle(req, res, session, slug);
    default:
      return res.status(405).json({ error: 'Method not allowed' });
  }
}

/**
 * Get a specific article by slug
 * 
 * Records a view if viewCount=true is passed as a query parameter
 */
async function getArticle(req, res, session, slug) {
  try {
    // Check if we should record a view
    const { viewCount } = req.query;
    
    // Get the article
    const { data: article, error } = await supabase
      .from('knowledge_articles')
      .select(`
        *,
        category:category_id(id, name, slug),
        tags:knowledge_article_tags(tag:tag_id(id, name, slug))
      `)
      .eq('slug', slug)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ error: 'Article not found' });
      }
      throw error;
    }

    // Check if article is published or user is admin
    const isAdmin = session?.user ? await checkIfAdmin(session.user.id) : false;
    if (!article.is_published && !isAdmin) {
      return res.status(404).json({ error: 'Article not found' });
    }

    // Format the response
    const formattedArticle = {
      ...article,
      tags: article.tags.map(t => t.tag)
    };

    // Record a view if requested
    if (viewCount === 'true') {
      try {
        await supabase
          .from('knowledge_article_views')
          .insert([
            {
              article_id: article.id,
              user_id: session?.user?.id || null,
              ip_address: req.headers['x-forwarded-for'] || req.socket.remoteAddress,
              user_agent: req.headers['user-agent'] || ''
            }
          ]);
      } catch (viewError) {
        console.error('Error recording view:', viewError);
        // Don't fail the request if view recording fails
      }
    }

    // Get related articles
    const { data: relatedArticles, error: relatedError } = await supabase
      .from('knowledge_related_articles')
      .select(`
        related_article:related_article_id(
          id,
          title,
          slug,
          excerpt,
          category_id(id, name, slug)
        )
      `)
      .eq('article_id', article.id)
      .order('display_order', { ascending: true });

    if (!relatedError && relatedArticles) {
      formattedArticle.related_articles = relatedArticles.map(ra => ra.related_article);
    }

    return res.status(200).json({ article: formattedArticle });
  } catch (error) {
    console.error('Error getting article:', error);
    return res.status(500).json({ error: 'Failed to get article' });
  }
}

/**
 * Update an article (admin only)
 * 
 * Creates a new revision of the article
 */
async function updateArticle(req, res, session, slug) {
  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    // Check if user is admin
    const isAdmin = await checkIfAdmin(session.user.id);
    if (!isAdmin) {
      return res.status(403).json({ error: 'Forbidden: Admin access required' });
    }

    // Get the current article
    const { data: currentArticle, error: getError } = await supabase
      .from('knowledge_articles')
      .select('*')
      .eq('slug', slug)
      .single();

    if (getError) {
      if (getError.code === 'PGRST116') {
        return res.status(404).json({ error: 'Article not found' });
      }
      throw getError;
    }

    const {
      title,
      content,
      excerpt,
      category_id,
      is_published,
      is_featured,
      meta_title,
      meta_description,
      tags = []
    } = req.body;

    // Validate required fields
    if (!title || !content) {
      return res.status(400).json({ error: 'Title and content are required' });
    }

    // Update the article
    const { data: article, error } = await supabase
      .from('knowledge_articles')
      .update({
        title,
        content,
        excerpt,
        category_id,
        is_published,
        is_featured,
        meta_title,
        meta_description,
        updated_at: new Date().toISOString(),
        updated_by: session.user.id
      })
      .eq('id', currentArticle.id)
      .select()
      .single();

    if (error) {
      throw error;
    }

    // Create a new revision
    const { data: revisions, error: revisionCountError } = await supabase
      .from('knowledge_article_revisions')
      .select('revision_number')
      .eq('article_id', article.id)
      .order('revision_number', { ascending: false })
      .limit(1);

    const nextRevisionNumber = revisionCountError || !revisions || revisions.length === 0
      ? 1
      : revisions[0].revision_number + 1;

    const { error: revisionError } = await supabase
      .from('knowledge_article_revisions')
      .insert([
        {
          article_id: article.id,
          title,
          content,
          excerpt,
          revision_number: nextRevisionNumber,
          created_by: session.user.id
        }
      ]);

    if (revisionError) {
      console.error('Error creating revision:', revisionError);
      // Don't fail the whole request if revision creation fails
    }

    // Update tags if provided
    if (tags.length > 0) {
      // First, remove existing tags
      const { error: deleteTagError } = await supabase
        .from('knowledge_article_tags')
        .delete()
        .eq('article_id', article.id);

      if (deleteTagError) {
        console.error('Error removing existing tags:', deleteTagError);
        // Don't fail the whole request if tag deletion fails
      }

      // Then, add new tags
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

    return res.status(200).json({ article });
  } catch (error) {
    console.error('Error updating article:', error);
    return res.status(500).json({ error: 'Failed to update article' });
  }
}

/**
 * Delete an article (admin only)
 */
async function deleteArticle(req, res, session, slug) {
  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    // Check if user is admin
    const isAdmin = await checkIfAdmin(session.user.id);
    if (!isAdmin) {
      return res.status(403).json({ error: 'Forbidden: Admin access required' });
    }

    // Get the article ID
    const { data: article, error: getError } = await supabase
      .from('knowledge_articles')
      .select('id')
      .eq('slug', slug)
      .single();

    if (getError) {
      if (getError.code === 'PGRST116') {
        return res.status(404).json({ error: 'Article not found' });
      }
      throw getError;
    }

    // Delete the article
    const { error } = await supabase
      .from('knowledge_articles')
      .delete()
      .eq('id', article.id);

    if (error) {
      throw error;
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error deleting article:', error);
    return res.status(500).json({ error: 'Failed to delete article' });
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
