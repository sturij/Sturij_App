// pages/knowledge/index.js
import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { supabase } from '../../lib/supabaseClient';

export default function KnowledgeBase() {
  const router = useRouter();
  const [categories, setCategories] = useState([]);
  const [featuredArticles, setFeaturedArticles] = useState([]);
  const [recentArticles, setRecentArticles] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        setError(null);
        
        // Load categories
        const { data: categoriesData, error: categoriesError } = await supabase
          .from('knowledge_categories')
          .select('*')
          .eq('is_active', true)
          .order('display_order', { ascending: true });
        
        if (categoriesError) throw categoriesError;
        
        // Load featured articles
        const { data: featuredData, error: featuredError } = await supabase
          .from('knowledge_articles')
          .select(`
            *,
            category:category_id(id, name, slug)
          `)
          .eq('is_published', true)
          .eq('is_featured', true)
          .order('created_at', { ascending: false })
          .limit(3);
        
        if (featuredError) throw featuredError;
        
        // Load recent articles
        const { data: recentData, error: recentError } = await supabase
          .from('knowledge_articles')
          .select(`
            *,
            category:category_id(id, name, slug)
          `)
          .eq('is_published', true)
          .order('created_at', { ascending: false })
          .limit(5);
        
        if (recentError) throw recentError;
        
        setCategories(categoriesData);
        setFeaturedArticles(featuredData);
        setRecentArticles(recentData);
      } catch (error) {
        console.error('Error loading knowledge base data:', error);
        setError('Failed to load knowledge base content. Please try again later.');
      } finally {
        setLoading(false);
      }
    }
    
    loadData();
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/knowledge/search?q=${encodeURIComponent(searchQuery)}`);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center items-center">
        <Head>
          <title>Knowledge Base | Sturij</title>
          <meta name="description" content="Browse our knowledge base for helpful articles and guides" />
        </Head>
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
        <p className="mt-4 text-gray-600">Loading knowledge base...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Head>
        <title>Knowledge Base | Sturij</title>
        <meta name="description" content="Browse our knowledge base for helpful articles and guides" />
      </Head>
      
      {/* Hero Section */}
      <div className="bg-indigo-700 text-white">
        <div className="max-w-7xl mx-auto py-16 px-4 sm:py-24 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl">
              How can we help you?
            </h1>
            <p className="mt-6 text-xl max-w-3xl mx-auto">
              Find answers to common questions and learn more about our services
            </p>
            
            {/* Search Form */}
            <form onSubmit={handleSearch} className="mt-8 max-w-xl mx-auto">
              <div className="flex rounded-md shadow-sm">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="focus:ring-indigo-500 focus:border-indigo-500 block w-full rounded-l-md sm:text-sm border-gray-300 px-4 py-3"
                  placeholder="Search for articles..."
                />
                <button
                  type="submit"
                  className="inline-flex items-center px-4 py-2 border border-transparent text-base font-medium rounded-r-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  Search
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
      
      {/* Main Content */}
      <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        {error && (
          <div className="rounded-md bg-red-50 p-4 mb-6">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Error</h3>
                <div className="mt-2 text-sm text-red-700">
                  <p>{error}</p>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Featured Articles */}
        {featuredArticles.length > 0 && (
          <div className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Featured Articles</h2>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {featuredArticles.map((article) => (
                <div key={article.id} className="bg-white overflow-hidden shadow rounded-lg hover:shadow-md transition-shadow duration-300">
                  <div className="p-6">
                    {article.category && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800 mb-2">
                        {article.category.name}
                      </span>
                    )}
                    <Link href={`/knowledge/article/${article.slug}`}>
                      <a className="block mt-2">
                        <p className="text-xl font-semibold text-gray-900">{article.title}</p>
                        <p className="mt-3 text-base text-gray-500">
                          {article.excerpt || article.content.substring(0, 150) + '...'}
                        </p>
                      </a>
                    </Link>
                    <div className="mt-6">
                      <Link href={`/knowledge/article/${article.slug}`}>
                        <a className="text-base font-semibold text-indigo-600 hover:text-indigo-500">
                          Read more <span aria-hidden="true">→</span>
                        </a>
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* Categories */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Browse by Category</h2>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {categories.length > 0 ? (
              categories.map((category) => (
                <Link key={category.id} href={`/knowledge/category/${category.slug}`}>
                  <a className="bg-white overflow-hidden shadow rounded-lg hover:shadow-md transition-shadow duration-300">
                    <div className="p-6">
                      <div className="flex items-center">
                        {category.icon && (
                          <div className="flex-shrink-0 mr-3">
                            <i className={`fas fa-${category.icon} text-indigo-600 text-2xl`}></i>
                          </div>
                        )}
                        <div>
                          <h3 className="text-lg font-medium text-gray-900">{category.name}</h3>
                          {category.description && (
                            <p className="mt-1 text-sm text-gray-500">{category.description}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </a>
                </Link>
              ))
            ) : (
              <div className="col-span-3 text-center py-12">
                <p className="text-gray-500">No categories found.</p>
              </div>
            )}
          </div>
        </div>
        
        {/* Recent Articles */}
        {recentArticles.length > 0 && (
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Recent Articles</h2>
            <div className="bg-white shadow overflow-hidden sm:rounded-md">
              <ul className="divide-y divide-gray-200">
                {recentArticles.map((article) => (
                  <li key={article.id}>
                    <Link href={`/knowledge/article/${article.slug}`}>
                      <a className="block hover:bg-gray-50">
                        <div className="px-4 py-4 sm:px-6">
                          <div className="flex items-center justify-between">
                            <p className="text-lg font-medium text-indigo-600 truncate">
                              {article.title}
                            </p>
                            <div className="ml-2 flex-shrink-0 flex">
                              {article.category && (
                                <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-indigo-100 text-indigo-800">
                                  {article.category.name}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="mt-2 sm:flex sm:justify-between">
                            <div className="sm:flex">
                              <p className="flex items-center text-sm text-gray-500">
                                {article.excerpt || article.content.substring(0, 150) + '...'}
                              </p>
                            </div>
                            <div className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0">
                              <p>
                                {new Date(article.created_at).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                        </div>
                      </a>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
