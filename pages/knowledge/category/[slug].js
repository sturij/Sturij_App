// pages/knowledge/category/[slug].js
import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { supabase } from '../../../lib/supabaseClient';

export default function CategoryView() {
  const router = useRouter();
  const { slug } = router.query;
  
  const [category, setCategory] = useState(null);
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Only fetch data when slug is available
    if (!slug) return;
    
    async function loadCategoryData() {
      try {
        setLoading(true);
        setError(null);
        
        // Fetch the category
        const { data: categoryData, error: categoryError } = await supabase
          .from('knowledge_categories')
          .select('*')
          .eq('slug', slug)
          .eq('is_active', true)
          .single();
        
        if (categoryError) throw categoryError;
        
        if (!categoryData) {
          setError('Category not found');
          setLoading(false);
          return;
        }
        
        setCategory(categoryData);
        
        // Fetch articles in this category
        const { data: articlesData, error: articlesError } = await supabase
          .from('knowledge_articles')
          .select('*')
          .eq('category_id', categoryData.id)
          .eq('is_published', true)
          .order('created_at', { ascending: false });
        
        if (articlesError) throw articlesError;
        
        setArticles(articlesData);
      } catch (error) {
        console.error('Error loading category data:', error);
        setError('Failed to load category data. Please try again later.');
      } finally {
        setLoading(false);
      }
    }
    
    loadCategoryData();
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center items-center">
        <Head>
          <title>Loading Category | Sturij Knowledge Base</title>
        </Head>
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
        <p className="mt-4 text-gray-600">Loading category...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center items-center">
        <Head>
          <title>Error | Sturij Knowledge Base</title>
        </Head>
        <div className="bg-white p-6 rounded-lg shadow-md max-w-md w-full">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Error</h1>
          <p className="text-gray-700 mb-6">{error}</p>
          <Link href="/knowledge">
            <a className="inline-flex items-center px-4 py-2 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
              Return to Knowledge Base
            </a>
          </Link>
        </div>
      </div>
    );
  }

  if (!category) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center items-center">
        <Head>
          <title>Category Not Found | Sturij Knowledge Base</title>
        </Head>
        <div className="bg-white p-6 rounded-lg shadow-md max-w-md w-full">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Category Not Found</h1>
          <p className="text-gray-700 mb-6">The category you're looking for doesn't exist or has been removed.</p>
          <Link href="/knowledge">
            <a className="inline-flex items-center px-4 py-2 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
              Return to Knowledge Base
            </a>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Head>
        <title>{category.name} | Sturij Knowledge Base</title>
        <meta name="description" content={category.description || `Browse articles in the ${category.name} category`} />
      </Head>
      
      <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        {/* Breadcrumbs */}
        <nav className="flex mb-8" aria-label="Breadcrumb">
          <ol className="flex items-center space-x-4">
            <li>
              <div>
                <Link href="/knowledge">
                  <a className="text-gray-400 hover:text-gray-500">
                    Knowledge Base
                  </a>
                </Link>
              </div>
            </li>
            <li>
              <div className="flex items-center">
                <svg className="flex-shrink-0 h-5 w-5 text-gray-300" xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                  <path d="M5.555 17.776l8-16 .894.448-8 16-.894-.448z" />
                </svg>
                <span className="ml-4 text-gray-500 font-medium" aria-current="page">
                  {category.name}
                </span>
              </div>
            </li>
          </ol>
        </nav>
        
        {/* Category Header */}
        <div className="bg-white shadow overflow-hidden sm:rounded-lg mb-8">
          <div className="px-4 py-5 sm:px-6">
            <h1 className="text-3xl font-bold text-gray-900">{category.name}</h1>
            {category.description && (
              <p className="mt-1 max-w-2xl text-sm text-gray-500">{category.description}</p>
            )}
          </div>
        </div>
        
        {/* Articles List */}
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <ul className="divide-y divide-gray-200">
            {articles.length > 0 ? (
              articles.map((article) => (
                <li key={article.id}>
                  <Link href={`/knowledge/article/${article.slug}`}>
                    <a className="block hover:bg-gray-50">
                      <div className="px-4 py-4 sm:px-6">
                        <div className="flex items-center justify-between">
                          <p className="text-lg font-medium text-indigo-600 truncate">
                            {article.title}
                          </p>
                          <div className="ml-2 flex-shrink-0 flex">
                            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                              {new Date(article.updated_at).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                        <div className="mt-2 sm:flex sm:justify-between">
                          <div className="sm:flex">
                            <p className="flex items-center text-sm text-gray-500">
                              {article.excerpt || article.content.substring(0, 150) + '...'}
                            </p>
                          </div>
                        </div>
                      </div>
                    </a>
                  </Link>
                </li>
              ))
            ) : (
              <li className="px-4 py-5 sm:px-6 text-center text-gray-500">
                No articles found in this category.
              </li>
            )}
          </ul>
        </div>
      </div>
    </div>
  );
}
