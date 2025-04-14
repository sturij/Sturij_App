// pages/api/knowledge/articles.js
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(req, res) {
  // Handle different HTTP methods
  switch (req.method) {
    case 'GET':
      return getArticles(req, res);
    case 'POST':
      return createArticle(req, res);
    default:
      return res.status(405).json({ error: 'Method not allowed' });
  }
}

// Get articles with optional filtering
async function getArticles(req, res) {
  try {
    const { 
      category, 
      tag, 
      search, 
      status, 
      featured,
      page = 1, 
      limit = 10,
      sort_by = 'created_at',
      sort_order = 'desc'
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
      const categoryQuery = supabase
        .from('knowledge_categories')
        .select('id')
        .eq('slug', category)
        .single();
      
      const { data: categoryData, error: categoryError } = await categoryQuery;
      
      if (!categoryError && categoryData) {
        query = query.eq('category_id', categoryData.id);
      }
    }
    
    if (tag) {
      query = query.contains('tags.tag.slug', [tag]);
    }
    
    if (search) {
      query = query.or(`title.ilike.%${search}%, content.ilike.%${search}%`);
    }
    
    if (status === 'published') {
      query = query.eq('is_published', true);
    } else if (status === 'draft') {
      query = query.eq('is_published', false);
    }
    
    if (featured === 'true') {
      query = query.eq('is_featured', true);
    }
    
    // Apply pagination
    const startIndex = (page - 1) * limit;
    query = query.range(startIndex, startIndex + limit - 1);
    
    // Apply sorting
    query = query.order(sort_by, { ascending: sort_order === 'asc' });
    
    // Execute the query
    const { data, error, count } = await query;
    
    if (error) {
      throw error;
    }
    
    // Get total count for pagination
    const { count: totalCount, error: countError } = await supabase
      .from('knowledge_articles')
      .select('*', { count: 'exact', head: true });
    
    if (countError) {
      throw countError;
    }
    
    return res.status(200).json({
      articles: data,
      pagination: {
        total: totalCount,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(totalCount / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching articles:', error);
    return res.status(500).json({ error: 'Failed to fetch articles' });
  }
}

// Create a new article
async function createArticle(req, res) {
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
      title, 
      content, 
      excerpt, 
      category_id, 
      tags, 
      is_published = false, 
      is_featured = false,
      meta_title,
      meta_description
    } = req.body;
    
    // Validate required fields
    if (!title || !content || !category_id) {
      return res.status(400).json({ error: 'Title, content, and category are required' });
    }
    
    // Create article
    const { data: article, error: articleError } = await supabase
      .from('knowledge_articles')
      .insert([
        {
          title,
          content,
          excerpt,
          category_id,
          is_published,
          is_featured,
          meta_title: meta_title || title,
          meta_description: meta_description || excerpt,
          created_by: user.id,
          updated_by: user.id
        }
      ])
      .select()
      .single();
    
    if (articleError) {
      throw articleError;
    }
    
    // Add tags if provided
    if (tags && tags.length > 0) {
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
          article_id: article.id,
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
    
    return res.status(201).json({ article });
  } catch (error) {
    console.error('Error creating article:', error);
    return res.status(500).json({ error: 'Failed to create article' });
  }
}
