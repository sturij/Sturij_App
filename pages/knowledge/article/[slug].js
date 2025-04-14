// pages/knowledge/article/[slug].js
import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { supabase } from '../../../lib/supabaseClient';
import ReactMarkdown from 'react-markdown';

export default function ArticleView() {
  const router = useRouter();
  const { slug } = router.query;
  
  const [article, setArticle] = useState(null);
  const [relatedArticles, setRelatedArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Only fetch data when slug is available
    if (!slug) return;
    
    async function loadArticle() {
      try {
        setLoading(true);
        setError(null);
        
        // Fetch the article
        const { data, error: articleError } = await supabase
          .from('knowledge_articles')
          .select(`
            *,
            category:category_id(id, name, slug),
            tags:knowledge_article_tags(tag:tag_id(id, name, slug))
          `)
          .eq('slug', slug)
          .eq('is_published', true)
          .single();
        
        if (articleError) throw articleError;
        
        if (!data) {
          setError('Article not found');
          setLoading(false);
          return;
        }
        
        setArticle(data);
        
        // Increment view count
        await supabase.rpc('increment_article_view', { article_slug: slug });
        
        // Fetch related articles (same category or tags)
        if (data.category_id) {
          const { data: relatedData, error: relatedError } = await supabase
            .from('knowledge_articles')
            .select(`
              id,
              title,
              slug,
              excerpt,
              category:category_id(id, name, slug)
            `)
            .eq('category_id', data.category_id)
            .eq('is_published', true)
            .neq('id', data.id)
            .order('view_count', { ascending: false })
            .limit(3);
          
          if (!relatedError) {
            setRelatedArticles(relatedData);
          }
        }
      } catch (error) {
        console.error('Error loading article:', error);
        setError('Failed to load article. Please try again later.');
      } finally {
        setLoading(false);
      }
    }
    
    loadArticle();
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center items-center">
        <Head>
          <title>Loading Article | Sturij Knowledge Base</title>
        </Head>
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
        <p className="mt-4 text-gray-600">Loading article...</p>
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

  if (!article) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center items-center">
        <Head>
          <title>Article Not Found | Sturij Knowledge Base</title>
        </Head>
        <div className="bg-white p-6 rounded-lg shadow-md max-w-md w-full">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Article Not Found</h1>
          <p className="text-gray-700 mb-6">The article you're looking for doesn't exist or has been removed.</p>
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
        <title>{article.meta_title || article.title} | Sturij Knowledge Base</title>
        <meta name="description" content={article.meta_description || article.excerpt || article.title} />
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
            {article.category && (
              <li>
                <div className="flex items-center">
                  <svg className="flex-shrink-0 h-5 w-5 text-gray-300" xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                    <path d="M5.555 17.776l8-16 .894.448-8 16-.894-.448z" />
                  </svg>
                  <Link href={`/knowledge/category/${article.category.slug}`}>
                    <a className="ml-4 text-gray-400 hover:text-gray-500">
                      {article.category.name}
                    </a>
                  </Link>
                </div>
              </li>
            )}
            <li>
              <div className="flex items-center">
                <svg className="flex-shrink-0 h-5 w-5 text-gray-300" xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                  <path d="M5.555 17.776l8-16 .894.448-8 16-.894-.448z" />
                </svg>
                <span className="ml-4 text-gray-500 font-medium" aria-current="page">
                  {article.title}
                </span>
              </div>
            </li>
          </ol>
        </nav>
        
        <div className="lg:grid lg:grid-cols-12 lg:gap-8">
          {/* Main Content */}
          <div className="lg:col-span-8">
            <div className="bg-white shadow overflow-hidden sm:rounded-lg">
              <div className="px-4 py-5 sm:px-6">
                <h1 className="text-3xl font-bold text-gray-900">{article.title}</h1>
                
                <div className="mt-2 flex flex-wrap items-center text-sm text-gray-500">
                  <span className="mr-4">
                    Updated: {new Date(article.updated_at).toLocaleDateString()}
                  </span>
                  
                  {article.category && (
                    <Link href={`/knowledge/category/${article.category.slug}`}>
                      <a className="mr-4 mt-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                        {article.category.name}
                      </a>
                    </Link>
                  )}
                  
                  {article.tags && article.tags.map(({ tag }) => (
                    <Link key={tag.id} href={`/knowledge/tag/${tag.slug}`}>
                      <a className="mr-2 mt-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                        {tag.name}
                      </a>
                    </Link>
                  ))}
                </div>
              </div>
              
              <div className="border-t border-gray-200 px-4 py-5 sm:px-6 prose prose-indigo max-w-none">
                {article.content ? (
                  <ReactMarkdown>{article.content}</ReactMarkdown>
                ) : (
                  <p className="text-gray-500 italic">No content available for this article.</p>
                )}
              </div>
            </div>
          </div>
          
          {/* Sidebar */}
          <div className="mt-8 lg:mt-0 lg:col-span-4">
            {/* Related Articles */}
            {relatedArticles.length > 0 && (
              <div className="bg-white shadow overflow-hidden sm:rounded-lg mb-6">
                <div className="px-4 py-5 sm:px-6">
                  <h2 className="text-lg font-medium text-gray-900">Related Articles</h2>
                </div>
                <div className="border-t border-gray-200">
                  <ul className="divide-y divide-gray-200">
                    {relatedArticles.map((relatedArticle) => (
                      <li key={relatedArticle.id}>
                        <Link href={`/knowledge/article/${relatedArticle.slug}`}>
                          <a className="block hover:bg-gray-50">
                            <div className="px-4 py-4 sm:px-6">
                              <p className="text-sm font-medium text-indigo-600 truncate">
                                {relatedArticle.title}
                              </p>
                              {relatedArticle.excerpt && (
                                <p className="mt-1 text-sm text-gray-500 line-clamp-2">
                                  {relatedArticle.excerpt}
                                </p>
                              )}
                            </div>
                          </a>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
            
            {/* Need More Help */}
            <div className="bg-indigo-50 shadow overflow-hidden sm:rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <h3 className="text-lg font-medium text-indigo-800">Need More Help?</h3>
                <div className="mt-2 text-sm text-indigo-700">
                  <p>
                    If you couldn't find what you're looking for, our support team is here to help.
                  </p>
                </div>
                <div className="mt-5">
                  <Link href="/contact">
                    <a className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                      Contact Support
                    </a>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
