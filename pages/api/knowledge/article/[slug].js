// pages/api/knowledge/article/[slug].js
import { supabase } from '../../../../lib/supabaseClient';

export default async function handler(req, res) {
  const { slug } = req.query;

  if (!slug) {
    return res.status(400).json({ error: 'Article slug is required' });
  }

  // Handle different HTTP methods
  switch (req.method) {
    case 'GET':
      return getArticle(req, res, slug);
    case 'PUT':
      return updateArticle(req, res, slug);
    case 'DELETE':
      return deleteArticle(req, res, slug);
    default:
      return res.status(405).json({ error: 'Method not allowed' });
  }
}

// Get a single article by slug
async function getArticle(req, res, slug) {
  try {
    // Get article
    const { data: article, error } = await supabase
      .from('knowledge_articles')
      .select(`
        *,
        category:category_id(id, name, slug),
        tags:knowledge_article_tags(tag:tag_id(id, name, slug)),
        related:knowledge_related_articles(
          related_article:related_article_id(id, title, slug, excerpt)
        )
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
    if (!article.is_published) {
      // Check if user is admin
      const authHeader = req.headers.authorization;
      if (!authHeader) {
        return res.status(404).json({ error: 'Article not found' });
      }

      const token = authHeader.split(' ')[1];
      const { data: { user } } = await supabase.auth.getUser(token);

      if (!user) {
        return res.status(404).json({ error: 'Article not found' });
      }

      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('is_admin')
        .eq('id', user.id)
        .single();

      if (userError || !userData.is_admin) {
        return res.status(404).json({ error: 'Article not found' });
      }
    }

    // Log view if article is published
    if (article.is_published) {
      // Get user info if available
      let userId = null;
      const authHeader = req.headers.authorization;
      if (authHeader) {
        const token = authHeader.split(' ')[1];
        const { data: { user } } = await supabase.auth.getUser(token);
        if (user) {
          userId = user.id;
        }
      }

      // Log view
      await supabase
        .from('knowledge_article_views')
        .insert([
          {
            article_id: article.id,
            user_id: userId,
            ip_address: req.headers['x-forwarded-for'] || req.socket.remoteAddress,
            user_agent: req.headers['user-agent']
          }
        ]);
    }

    return res.status(200).json({ article });
  } catch (error) {
    console.error('Error fetching article:', error);
    return res.status(500).json({ error: 'Failed to fetch article' });
  }
}

// Update an article
async function updateArticle(req, res, slug) {
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

    // Get article ID from slug
    const { data: existingArticle, error: articleError } = await supabase
      .from('knowledge_articles')
      .select('id, title, content')
      .eq('slug', slug)
      .single();

    if (articleError) {
      if (articleError.code === 'PGRST116') {
        return res.status(404).json({ error: 'Article not found' });
      }
      throw articleError;
    }

    const { 
      title, 
      content, 
      excerpt, 
      category_id, 
      tags, 
      is_published, 
      is_featured,
      meta_title,
      meta_description
    } = req.body;

    // Create revision of current article
    await supabase
      .from('knowledge_article_revisions')
      .insert([
        {
          article_id: existingArticle.id,
          title: existingArticle.title,
          content: existingArticle.content,
          revision_number: 1, // This should be incremented based on existing revisions
          created_by: user.id
        }
      ]);

    // Update article
    const { data: updatedArticle, error: updateError } = await supabase
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
        updated_by: user.id,
        updated_at: new Date().toISOString()
      })
      .eq('id', existingArticle.id)
      .select()
      .single();

    if (updateError) {
      throw updateError;
    }

    // Update tags if provided
    if (tags && Array.isArray(tags)) {
      // Remove existing tags
      await supabase
        .from('knowledge_article_tags')
        .delete()
        .eq('article_id', existingArticle.id);

      // Add new tags
      const tagInserts = [];

      for (const tagName of tags) {
        // Check if tag exists
        let { data: existingTag, error: tagError } = await supabase
          .from('knowledge_tags')
          .select('id')
          .eq('name', tagName)
          .single();

        if (tagError) {
          // Create new tag
          const { data: newTag, error: newTagError } = await supabase
            .from('knowledge_tags')
            .insert([{ name: tagName }])
            .select()
            .single();

          if (newTagError) {
            throw newTagError;
          }

          existingTag = newTag;
        }

        // Link tag to article
        tagInserts.push({
          article_id: existingArticle.id,
          tag_id: existingTag.id
        });
      }

      if (tagInserts.length > 0) {
        const { error: linkError } = await supabase
          .from('knowledge_article_tags')
          .insert(tagInserts);

        if (linkError) {
          throw linkError;
        }
      }
    }

    return res.status(200).json({ article: updatedArticle });
  } catch (error) {
    console.error('Error updating article:', error);
    return res.status(500).json({ error: 'Failed to update article' });
  }
}

// Delete an article
async function deleteArticle(req, res, slug) {
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

    // Get article ID from slug
    const { data: article, error: articleError } = await supabase
      .from('knowledge_articles')
      .select('id')
      .eq('slug', slug)
      .single();

    if (articleError) {
      if (articleError.code === 'PGRST116') {
        return res.status(404).json({ error: 'Article not found' });
      }
      throw articleError;
    }

    // Delete article
    const { error: deleteError } = await supabase
      .from('knowledge_articles')
      .delete()
      .eq('id', article.id);

    if (deleteError) {
      throw deleteError;
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error deleting article:', error);
    return res.status(500).json({ error: 'Failed to delete article' });
  }
}