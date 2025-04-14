// Integration fix: Ensure proper error handling in knowledge base API endpoints
// pages/api/knowledge/search.js - Update to improve error handling and response format

import { supabase } from '../../../lib/supabaseClient';

/**
 * API endpoint for searching knowledge base articles
 * 
 * GET: Search articles by query string
 */
export default async function handler(req, res) {
  // Only allow GET method
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { q: query } = req.query;

  if (!query || query.trim() === '') {
    return res.status(400).json({ 
      error: 'Search query is required',
      results: [] 
    });
  }

  try {
    // Normalize the search query
    const normalizedQuery = query.trim().toLowerCase();
    
    // Search articles that match the query in title, content, or excerpt
    const { data: articles, error: articlesError } = await supabase
      .from('knowledge_articles')
      .select(`
        id,
        title,
        slug,
        excerpt,
        content,
        category_id,
        created_at,
        updated_at,
        view_count,
        category:category_id(id, name, slug)
      `)
      .eq('is_published', true)
      .or(`title.ilike.%${normalizedQuery}%,content.ilike.%${normalizedQuery}%,excerpt.ilike.%${normalizedQuery}%`)
      .order('view_count', { ascending: false });
    
    if (articlesError) {
      console.error('Error searching articles:', articlesError);
      return res.status(500).json({ 
        error: 'Failed to search articles',
        results: [] 
      });
    }
    
    // Also search for tags that match the query
    const { data: tags, error: tagsError } = await supabase
      .from('knowledge_tags')
      .select(`
        id,
        name,
        slug,
        articles:knowledge_article_tags(
          article:article_id(
            id,
            title,
            slug,
            excerpt,
            content,
            category_id,
            created_at,
            updated_at,
            view_count,
            category:category_id(id, name, slug)
          )
        )
      `)
      .ilike('name', `%${normalizedQuery}%`);
    
    if (tagsError) {
      console.error('Error searching tags:', tagsError);
      // Continue with just the articles results
    }
    
    // Extract articles from tags and combine with direct article matches
    let tagArticles = [];
    if (tags && tags.length > 0) {
      tags.forEach(tag => {
        if (tag.articles && tag.articles.length > 0) {
          tag.articles.forEach(articleTag => {
            if (articleTag.article && articleTag.article.is_published) {
              tagArticles.push(articleTag.article);
            }
          });
        }
      });
    }
    
    // Combine and deduplicate results
    let allResults = [...(articles || [])];
    
    // Add tag articles if they're not already in the results
    tagArticles.forEach(tagArticle => {
      if (!allResults.some(article => article.id === tagArticle.id)) {
        allResults.push(tagArticle);
      }
    });
    
    // Sort by relevance (view count as a proxy for relevance)
    allResults.sort((a, b) => b.view_count - a.view_count);
    
    return res.status(200).json({
      query: normalizedQuery,
      results: allResults,
      total: allResults.length
    });
  } catch (error) {
    console.error('Error in search API:', error);
    return res.status(500).json({ 
      error: 'An unexpected error occurred while searching',
      results: [] 
    });
  }
}
