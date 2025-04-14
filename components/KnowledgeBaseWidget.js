// components/KnowledgeBaseWidget.js
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '../lib/supabaseClient';

const KnowledgeBaseWidget = ({ category, limit = 3 }) => {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadArticles() {
      try {
        setLoading(true);
        setError(null);
        
        let query = supabase
          .from('knowledge_articles')
          .select(`
            id,
            title,
            slug,
            excerpt,
            category:category_id(id, name, slug)
          `)
          .eq('is_published', true)
          .order('view_count', { ascending: false })
          .limit(limit);
        
        // If category is provided, filter by category
        if (category) {
          // First get the category ID from slug if needed
          if (typeof category === 'string') {
            const { data: categoryData } = await supabase
              .from('knowledge_categories')
              .select('id')
              .eq('slug', category)
              .single();
              
            if (categoryData) {
              query = query.eq('category_id', categoryData.id);
            }
          } else if (typeof category === 'number') {
            query = query.eq('category_id', category);
          }
        }
        
        const { data, error: articlesError } = await query;
        
        if (articlesError) throw articlesError;
        
        setArticles(data || []);
      } catch (error) {
        console.error('Error loading knowledge base articles:', error);
        setError('Failed to load articles');
      } finally {
        setLoading(false);
      }
    }
    
    loadArticles();
  }, [category, limit]);

  if (loading) {
    return (
      <div className="bg-white shadow rounded-lg p-4">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Helpful Resources</h3>
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-3/4 mb-3"></div>
          <div className="h-4 bg-gray-200 rounded w-full mb-3"></div>
          <div className="h-4 bg-gray-200 rounded w-5/6 mb-3"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white shadow rounded-lg p-4">
        <h3 className="text-lg font-medium text-gray-900 mb-2">Helpful Resources</h3>
        <p className="text-sm text-gray-500">Unable to load articles at this time.</p>
      </div>
    );
  }

  if (articles.length === 0) {
    return (
      <div className="bg-white shadow rounded-lg p-4">
        <h3 className="text-lg font-medium text-gray-900 mb-2">Helpful Resources</h3>
        <p className="text-sm text-gray-500">No articles available.</p>
        <Link href="/knowledge">
          <a className="mt-3 text-sm font-medium text-indigo-600 hover:text-indigo-500">
            Browse Knowledge Base
          </a>
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-white shadow rounded-lg p-4">
      <h3 className="text-lg font-medium text-gray-900 mb-4">Helpful Resources</h3>
      <ul className="space-y-3">
        {articles.map((article) => (
          <li key={article.id}>
            <Link href={`/knowledge/article/${article.slug}`}>
              <a className="block hover:bg-gray-50 -m-2 p-2 rounded">
                <p className="text-sm font-medium text-indigo-600">{article.title}</p>
                {article.excerpt && (
                  <p className="mt-1 text-xs text-gray-500 line-clamp-2">{article.excerpt}</p>
                )}
              </a>
            </Link>
          </li>
        ))}
      </ul>
      <div className="mt-4 pt-3 border-t border-gray-200">
        <Link href="/knowledge">
          <a className="text-sm font-medium text-indigo-600 hover:text-indigo-500">
            View all articles <span aria-hidden="true">→</span>
          </a>
        </Link>
      </div>
    </div>
  );
};

export default KnowledgeBaseWidget;
