// pages/knowledge/search.js
import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { supabase } from '../../lib/supabaseClient';

export default function SearchResults() {
  const router = useRouter();
  const { q: query } = router.query;
  
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    // Set the search input to match the query parameter
    if (query) {
      setSearchQuery(query);
    }
    
    // Only search when query is available
    if (!query) return;
    
    async function performSearch() {
      try {
        setLoading(true);
        setError(null);
        
        // Perform search using the search API endpoint
        const response = await fetch(`/api/knowledge/search?q=${encodeURIComponent(query)}`);
        const data = await response.json();
        
        if (!response.ok) {
          throw new Error(data.error || 'Search failed');
        }
        
        setResults(data.results);
      } catch (error) {
        console.error('Error searching knowledge base:', error);
        setError('Failed to search knowledge base. Please try again later.');
      } finally {
        setLoading(false);
      }
    }
    
    performSearch();
  }, [query]);

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/knowledge/search?q=${encodeURIComponent(searchQuery)}`);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Head>
        <title>{query ? `Search results for "${query}"` : 'Search'} | Sturij Knowledge Base</title>
        <meta name="description" content={query ? `Search results for "${query}" in the Sturij Knowledge Base` : 'Search the Sturij Knowledge Base'} />
      </Head>
      
      {/* Search Header */}
      <div className="bg-indigo-700 text-white">
        <div className="max-w-7xl mx-auto py-12 px-4 sm:py-16 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
              {query ? `Search results for "${query}"` : 'Search Knowledge Base'}
            </h1>
            
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
                  Search Results
                </span>
              </div>
            </li>
          </ol>
        </nav>
        
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
        
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
            <p className="ml-4 text-gray-600">Searching...</p>
          </div>
        ) : (
          <div>
            {query && (
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-900">
                  {results.length === 0
                    ? 'No results found'
                    : `Found ${results.length} result${results.length === 1 ? '' : 's'}`}
                </h2>
              </div>
            )}
            
            {results.length > 0 ? (
              <div className="bg-white shadow overflow-hidden sm:rounded-md">
                <ul className="divide-y divide-gray-200">
                  {results.map((result) => (
                    <li key={result.id}>
                      <Link href={`/knowledge/article/${result.slug}`}>
                        <a className="block hover:bg-gray-50">
                          <div className="px-4 py-4 sm:px-6">
                            <div className="flex items-center justify-between">
                              <p className="text-lg font-medium text-indigo-600 truncate">
                                {result.title}
                              </p>
                              <div className="ml-2 flex-shrink-0 flex">
                                {result.category && (
                                  <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-indigo-100 text-indigo-800">
                                    {result.category.name}
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="mt-2 sm:flex sm:justify-between">
                              <div className="sm:flex">
                                <p className="flex items-center text-sm text-gray-500">
                                  {result.excerpt || result.content.substring(0, 150) + '...'}
                                </p>
                              </div>
                              <div className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0">
                                <p>
                                  {new Date(result.updated_at).toLocaleDateString()}
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
            ) : query ? (
              <div className="bg-white shadow overflow-hidden sm:rounded-lg">
                <div className="px-4 py-5 sm:p-6 text-center">
                  <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <h3 className="mt-2 text-lg font-medium text-gray-900">No results found</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    We couldn't find any articles matching your search. Try using different keywords or browse our categories.
                  </p>
                  <div className="mt-6">
                    <Link href="/knowledge">
                      <a className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                        Browse Knowledge Base
                      </a>
                    </Link>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
