// knowledge-admin.js - JavaScript for the knowledge base admin interface

document.addEventListener('DOMContentLoaded', function() {
  // Initialize the tabs
  initTabs();
  
  // Load the articles list by default
  loadArticles();
  
  // Initialize the article form
  initArticleForm();
  
  // Initialize category management
  initCategories();
  
  // Initialize tag management
  initTags();
  
  // Initialize the new article button
  document.getElementById('new-article-button').addEventListener('click', function() {
    showArticleForm();
  });
  
  // Initialize search and filters
  initSearchAndFilters();
});

// Tab functionality
function initTabs() {
  const tabButtons = document.querySelectorAll('.tab-button');
  const tabContents = document.querySelectorAll('.tab-content');
  
  tabButtons.forEach(button => {
    button.addEventListener('click', function() {
      const tabName = this.getAttribute('data-tab');
      
      // Hide all tab contents
      tabContents.forEach(content => {
        content.style.display = 'none';
      });
      
      // Remove active class from all tab buttons
      tabButtons.forEach(btn => {
        btn.classList.remove('border-indigo-500', 'text-indigo-600');
        btn.classList.add('border-transparent', 'text-gray-500');
      });
      
      // Show the selected tab content
      document.getElementById(`${tabName}-tab`).style.display = 'block';
      
      // Add active class to the clicked tab button
      this.classList.remove('border-transparent', 'text-gray-500');
      this.classList.add('border-indigo-500', 'text-indigo-600');
      
      // Load content based on the selected tab
      if (tabName === 'articles') {
        loadArticles();
      } else if (tabName === 'categories') {
        loadCategories();
      } else if (tabName === 'tags') {
        loadTags();
      } else if (tabName === 'analytics') {
        loadAnalytics();
      }
    });
  });
}

// Articles management
async function loadArticles() {
  try {
    const response = await fetch('/api/knowledge/articles');
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'Failed to load articles');
    }
    
    renderArticlesTable(data.articles);
  } catch (error) {
    console.error('Error loading articles:', error);
    showNotification('Error loading articles: ' + error.message, 'error');
  }
}

function renderArticlesTable(articles) {
  const tableBody = document.getElementById('articles-table-body');
  
  if (!articles || articles.length === 0) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="6" class="px-6 py-4 text-center text-gray-500">
          No articles found. Create your first article to get started.
        </td>
      </tr>
    `;
    return;
  }
  
  tableBody.innerHTML = '';
  
  articles.forEach(article => {
    const row = document.createElement('tr');
    
    row.innerHTML = `
      <td class="px-6 py-4 whitespace-nowrap">
        <div class="text-sm font-medium text-gray-900">${article.title}</div>
        <div class="text-sm text-gray-500">${article.excerpt || 'No excerpt available'}</div>
      </td>
      <td class="px-6 py-4 whitespace-nowrap">
        <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
          ${article.category ? article.category.name : 'Uncategorized'}
        </span>
      </td>
      <td class="px-6 py-4 whitespace-nowrap">
        <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${article.is_published ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}">
          ${article.is_published ? 'Published' : 'Draft'}
        </span>
      </td>
      <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
        ${article.view_count || 0}
      </td>
      <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
        ${new Date(article.updated_at).toLocaleDateString()}
      </td>
      <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
        <a href="#" class="text-indigo-600 hover:text-indigo-900 mr-3" data-action="edit" data-id="${article.id}">Edit</a>
        <a href="#" class="text-red-600 hover:text-red-900" data-action="delete" data-id="${article.id}">Delete</a>
      </td>
    `;
    
    // Add event listeners for edit and delete actions
    row.querySelector('[data-action="edit"]').addEventListener('click', function(e) {
      e.preventDefault();
      editArticle(article.id);
    });
    
    row.querySelector('[data-action="delete"]').addEventListener('click', function(e) {
      e.preventDefault();
      deleteArticle(article.id, article.title);
    });
    
    tableBody.appendChild(row);
  });
}

async function editArticle(articleId) {
  try {
    const response = await fetch(`/api/knowledge/articles/${articleId}`);
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'Failed to load article');
    }
    
    showArticleForm(data.article);
  } catch (error) {
    console.error('Error loading article for editing:', error);
    showNotification('Error loading article: ' + error.message, 'error');
  }
}

function showArticleForm(article = null) {
  // Create or show the article form modal
  let modal = document.getElementById('article-form-modal');
  
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'article-form-modal';
    modal.className = 'fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full flex items-center justify-center';
    modal.innerHTML = `
      <div class="relative bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 my-8">
        <div class="flex justify-between items-center p-4 border-b">
          <h3 class="text-lg font-medium text-gray-900">${article ? 'Edit Article' : 'Create New Article'}</h3>
          <button type="button" class="text-gray-400 hover:text-gray-500" id="close-article-modal">
            <span class="sr-only">Close</span>
            <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <form id="article-form" class="p-4">
          <input type="hidden" id="article-id" value="${article ? article.id : ''}">
          
          <div class="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
            <div class="sm:col-span-6">
              <label for="article-title" class="block text-sm font-medium text-gray-700">Title</label>
              <div class="mt-1">
                <input type="text" id="article-title" class="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md" required>
              </div>
            </div>
            
            <div class="sm:col-span-6">
              <label for="article-slug" class="block text-sm font-medium text-gray-700">Slug</label>
              <div class="mt-1">
                <input type="text" id="article-slug" class="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md">
                <p class="mt-1 text-sm text-gray-500">Leave blank to auto-generate from title</p>
              </div>
            </div>
            
            <div class="sm:col-span-3">
              <label for="article-category" class="block text-sm font-medium text-gray-700">Category</label>
              <div class="mt-1">
                <select id="article-category" class="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md">
                  <option value="">Select a category</option>
                </select>
              </div>
            </div>
            
            <div class="sm:col-span-3">
              <label for="article-tags" class="block text-sm font-medium text-gray-700">Tags</label>
              <div class="mt-1">
                <select id="article-tags" class="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md" multiple>
                </select>
              </div>
            </div>
            
            <div class="sm:col-span-6">
              <label for="article-excerpt" class="block text-sm font-medium text-gray-700">Excerpt</label>
              <div class="mt-1">
                <textarea id="article-excerpt" rows="3" class="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"></textarea>
              </div>
            </div>
            
            <div class="sm:col-span-6">
              <label for="article-content" class="block text-sm font-medium text-gray-700">Content</label>
              <div class="mt-1">
                <textarea id="article-content" rows="10" class="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"></textarea>
              </div>
            </div>
            
            <div class="sm:col-span-3">
              <div class="flex items-center">
                <input type="checkbox" id="article-published" class="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded">
                <label for="article-published" class="ml-2 block text-sm text-gray-700">Published</label>
              </div>
            </div>
            
            <div class="sm:col-span-3">
              <div class="flex items-center">
                <input type="checkbox" id="article-featured" class="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded">
                <label for="article-featured" class="ml-2 block text-sm text-gray-700">Featured</label>
              </div>
            </div>
            
            <div class="sm:col-span-6">
              <label for="article-meta-title" class="block text-sm font-medium text-gray-700">Meta Title</label>
              <div class="mt-1">
                <input type="text" id="article-meta-title" class="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md">
              </div>
            </div>
            
            <div class="sm:col-span-6">
              <label for="article-meta-description" class="block text-sm font-medium text-gray-700">Meta Description</label>
              <div class="mt-1">
                <textarea id="article-meta-description" rows="2" class="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"></textarea>
              </div>
            </div>
          </div>
          
          <div class="mt-6 flex justify-end space-x-3">
            <button type="button" id="cancel-article-form" class="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
              Cancel
            </button>
            <button type="submit" class="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
              ${article ? 'Update' : 'Create'} Article
            </button>
          </div>
        </form>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    // Initialize the Markdown editor
    const easyMDE = new EasyMDE({
      element: document.getElementById('article-content'),
      spellChecker: false,
      autosave: {
        enabled: true,
        uniqueId: 'article-content-autosave',
        delay: 1000,
      }
    });
    
    // Close modal events
    document.getElementById('close-article-modal').addEventListener('click', closeArticleForm);
    document.getElementById('cancel-article-form').addEventListener('click', closeArticleForm);
    
    // Load categories and tags
    loadCategoriesForSelect();
    loadTagsForSelect();
    
    // Form submission
    document.getElementById('article-form').addEventListener('submit', function(e) {
      e.preventDefault();
      saveArticle(easyMDE);
    });
  } else {
    modal.style.display = 'flex';
  }
  
  // Fill form with article data if editing
  if (article) {
    document.getElementById('article-id').value = article.id;
    document.getElementById('article-title').value = article.title;
    document.getElementById('article-slug').value = article.slug;
    document.getElementById('article-excerpt').value = article.excerpt || '';
    
    // Set content in the editor
    const easyMDE = EasyMDE.findByTextArea(document.getElementById('article-content'));
    easyMDE.value(article.content || '');
    
    document.getElementById('article-published').checked = article.is_published;
    document.getElementById('article-featured').checked = article.is_featured;
    document.getElementById('article-meta-title').value = article.meta_title || '';
    document.getElementById('article-meta-description').value = article.meta_description || '';
    
    // Set category and tags after they're loaded
    setTimeout(() => {
      if (article.category_id) {
        document.getElementById('article-category').value = article.category_id;
      }
      
      if (article.tags && article.tags.length > 0) {
        const tagSelect = document.getElementById('article-tags');
        article.tags.forEach(tag => {
          for (let i = 0; i < tagSelect.options.length; i++) {
            if (tagSelect.options[i].value == tag.id) {
              tagSelect.options[i].selected = true;
              break;
            }
          }
        });
      }
    }, 500);
  }
}

function closeArticleForm() {
  const modal = document.getElementById('article-form-modal');
  if (modal) {
    modal.style.display = 'none';
  }
}

async function loadCategoriesForSelect() {
  try {
    const response = await fetch('/api/knowledge/categories');
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'Failed to load categories');
    }
    
    const categorySelect = document.getElementById('article-category');
    categorySelect.innerHTML = '<option value="">Select a category</option>';
    
    data.categories.forEach(category => {
      const option = document.createElement('option');
      option.value = category.id;
      option.textContent = category.name;
      categorySelect.appendChild(option);
    });
  } catch (error) {
    console.error('Error loading categories:', error);
    showNotification('Error loading categories: ' + error.message, 'error');
  }
}

async function loadTagsForSelect() {
  try {
    const response = await fetch('/api/knowledge/tags');
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'Failed to load tags');
    }
    
    const tagSelect = document.getElementById('article-tags');
    tagSelect.innerHTML = '';
    
    data.tags.forEach(tag => {
      const option = document.createElement('option');
      option.value = tag.id;
      option.textContent = tag.name;
      tagSelect.appendChild(option);
    });
  } catch (error) {
    console.error('Error loading tags:', error);
    showNotification('Error loading tags: ' + error.message, 'error');
  }
}

async function saveArticle(easyMDE) {
  try {
    const articleId = document.getElementById('article-id').value;
    const isUpdate = articleId !== '';
    
    // Get selected tags
    const tagSelect = document.getElementById('article-tags');
    const selectedTags = Array.from(tagSelect.selectedOptions).map(option => option.value);
    
    const articleData = {
      title: document.getElementById('article-title').value,
      slug: document.getElementById('article-slug').value || null,
      category_id: document.getElementById('article-category').value || null,
      excerpt: document.getElementById('article-excerpt').value,
      content: easyMDE.value(),
      is_published: document.getElementById('article-published').checked,
      is_featured: document.getElementById('article-featured').checked,
      meta_title: document.getElementById('article-meta-title').value,
      meta_description: document.getElementById('article-meta-description').value,
      tags: selectedTags
    };
    
    const url = isUpdate ? `/api/knowledge/articles/${articleId}` : '/api/knowledge/articles';
    const method = isUpdate ? 'PUT' : 'POST';
    
    const response = await fetch(url, {
      method: method,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(articleData),
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'Failed to save article');
    }
    
    showNotification(`Article ${isUpdate ? 'updated' : 'created'} successfully`, 'success');
    closeArticleForm();
    loadArticles();
  } catch (error) {
    console.error('Error saving article:', error);
    showNotification('Error saving article: ' + error.message, 'error');
  }
}

async function deleteArticle(articleId, articleTitle) {
  if (confirm(`Are you sure you want to delete "${articleTitle}"? This action cannot be undone.`)) {
    try {
      const response = await fetch(`/api/knowledge/articles/${articleId}`, {
        method: 'DELETE',
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete article');
      }
      
      showNotification('Article deleted successfully', 'success');
      loadArticles();
    } catch (error) {
      console.error('Error deleting article:', error);
      showNotification('Error deleting article: ' + error.message, 'error');
    }
  }
}

// Categories management
async function loadCategories() {
  try {
    const response = await fetch('/api/knowledge/categories');
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'Failed to load categories');
    }
    
    renderCategoriesTable(data.categories);
  } catch (error) {
    console.error('Error loading categories:', error);
    showNotification('Error loading categories: ' + error.message, 'error');
  }
}

function renderCategoriesTable(categories) {
  const categoriesTab = document.getElementById('categories-tab');
  
  if (!categoriesTab.querySelector('.categories-table-container')) {
    categoriesTab.innerHTML = `
      <div class="flex justify-between items-center mb-6">
        <h2 class="text-xl font-medium text-gray-900">Categories</h2>
        <button id="new-category-button" class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
          <i class="fas fa-plus mr-2"></i> New Category
        </button>
      </div>
      
      <div class="categories-table-container flex flex-col">
        <div class="-my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
          <div class="py-2 align-middle inline-block min-w-full sm:px-6 lg:px-8">
            <div class="shadow overflow-hidden border-b border-gray-200 sm:rounded-lg">
              <table class="min-w-full divide-y divide-gray-200">
                <thead class="bg-gray-50">
                  <tr>
                    <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Name
                    </th>
                    <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Slug
                    </th>
                    <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Parent
                    </th>
                    <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Articles
                    </th>
                    <th scope="col" class="relative px-6 py-3">
                      <span class="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody id="categories-table-body" class="bg-white divide-y divide-gray-200">
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    `;
    
    document.getElementById('new-category-button').addEventListener('click', function() {
      showCategoryForm();
    });
  }
  
  const tableBody = document.getElementById('categories-table-body');
  
  if (!categories || categories.length === 0) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="6" class="px-6 py-4 text-center text-gray-500">
          No categories found. Create your first category to get started.
        </td>
      </tr>
    `;
    return;
  }
  
  tableBody.innerHTML = '';
  
  categories.forEach(category => {
    const row = document.createElement('tr');
    
    row.innerHTML = `
      <td class="px-6 py-4 whitespace-nowrap">
        <div class="text-sm font-medium text-gray-900">${category.name}</div>
        <div class="text-sm text-gray-500">${category.description || ''}</div>
      </td>
      <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
        ${category.slug}
      </td>
      <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
        ${category.parent ? category.parent.name : '-'}
      </td>
      <td class="px-6 py-4 whitespace-nowrap">
        <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${category.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">
          ${category.is_active ? 'Active' : 'Inactive'}
        </span>
      </td>
      <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
        ${category.article_count || 0}
      </td>
      <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
        <a href="#" class="text-indigo-600 hover:text-indigo-900 mr-3" data-action="edit" data-id="${category.id}">Edit</a>
        <a href="#" class="text-red-600 hover:text-red-900" data-action="delete" data-id="${category.id}">Delete</a>
      </td>
    `;
    
    // Add event listeners for edit and delete actions
    row.querySelector('[data-action="edit"]').addEventListener('click', function(e) {
      e.preventDefault();
      editCategory(category.id);
    });
    
    row.querySelector('[data-action="delete"]').addEventListener('click', function(e) {
      e.preventDefault();
      deleteCategory(category.id, category.name);
    });
    
    tableBody.appendChild(row);
  });
}

// Tags management
async function loadTags() {
  try {
    const response = await fetch('/api/knowledge/tags');
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'Failed to load tags');
    }
    
    renderTagsTable(data.tags);
  } catch (error) {
    console.error('Error loading tags:', error);
    showNotification('Error loading tags: ' + error.message, 'error');
  }
}

function renderTagsTable(tags) {
  const tagsTab = document.getElementById('tags-tab');
  
  if (!tagsTab.querySelector('.tags-table-container')) {
    tagsTab.innerHTML = `
      <div class="flex justify-between items-center mb-6">
        <h2 class="text-xl font-medium text-gray-900">Tags</h2>
        <button id="new-tag-button" class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
          <i class="fas fa-plus mr-2"></i> New Tag
        </button>
      </div>
      
      <div class="tags-table-container flex flex-col">
        <div class="-my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
          <div class="py-2 align-middle inline-block min-w-full sm:px-6 lg:px-8">
            <div class="shadow overflow-hidden border-b border-gray-200 sm:rounded-lg">
              <table class="min-w-full divide-y divide-gray-200">
                <thead class="bg-gray-50">
                  <tr>
                    <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Name
                    </th>
                    <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Slug
                    </th>
                    <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Usage Count
                    </th>
                    <th scope="col" class="relative px-6 py-3">
                      <span class="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody id="tags-table-body" class="bg-white divide-y divide-gray-200">
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    `;
    
    document.getElementById('new-tag-button').addEventListener('click', function() {
      showTagForm();
    });
  }
  
  const tableBody = document.getElementById('tags-table-body');
  
  if (!tags || tags.length === 0) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="4" class="px-6 py-4 text-center text-gray-500">
          No tags found. Create your first tag to get started.
        </td>
      </tr>
    `;
    return;
  }
  
  tableBody.innerHTML = '';
  
  tags.forEach(tag => {
    const row = document.createElement('tr');
    
    row.innerHTML = `
      <td class="px-6 py-4 whitespace-nowrap">
        <div class="text-sm font-medium text-gray-900">${tag.name}</div>
      </td>
      <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
        ${tag.slug}
      </td>
      <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
        ${tag.usage_count || 0}
      </td>
      <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
        <a href="#" class="text-indigo-600 hover:text-indigo-900 mr-3" data-action="edit" data-id="${tag.id}">Edit</a>
        <a href="#" class="text-red-600 hover:text-red-900" data-action="delete" data-id="${tag.id}">Delete</a>
      </td>
    `;
    
    // Add event listeners for edit and delete actions
    row.querySelector('[data-action="edit"]').addEventListener('click', function(e) {
      e.preventDefault();
      editTag(tag.id);
    });
    
    row.querySelector('[data-action="delete"]').addEventListener('click', function(e) {
      e.preventDefault();
      deleteTag(tag.id, tag.name);
    });
    
    tableBody.appendChild(row);
  });
}

// Analytics
function loadAnalytics() {
  const analyticsTab = document.getElementById('analytics-tab');
  
  analyticsTab.innerHTML = `
    <div class="mb-6">
      <h2 class="text-xl font-medium text-gray-900">Knowledge Base Analytics</h2>
      <p class="mt-1 text-sm text-gray-500">View statistics and insights about your knowledge base content</p>
    </div>
    
    <div class="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
      <div class="bg-white overflow-hidden shadow rounded-lg">
        <div class="px-4 py-5 sm:p-6">
          <dl>
            <dt class="text-sm font-medium text-gray-500 truncate">Total Articles</dt>
            <dd class="mt-1 text-3xl font-semibold text-gray-900" id="total-articles">Loading...</dd>
          </dl>
        </div>
      </div>
      
      <div class="bg-white overflow-hidden shadow rounded-lg">
        <div class="px-4 py-5 sm:p-6">
          <dl>
            <dt class="text-sm font-medium text-gray-500 truncate">Total Views</dt>
            <dd class="mt-1 text-3xl font-semibold text-gray-900" id="total-views">Loading...</dd>
          </dl>
        </div>
      </div>
      
      <div class="bg-white overflow-hidden shadow rounded-lg">
        <div class="px-4 py-5 sm:p-6">
          <dl>
            <dt class="text-sm font-medium text-gray-500 truncate">Average Views per Article</dt>
            <dd class="mt-1 text-3xl font-semibold text-gray-900" id="avg-views">Loading...</dd>
          </dl>
        </div>
      </div>
    </div>
    
    <div class="mt-8 bg-white shadow rounded-lg">
      <div class="px-4 py-5 sm:p-6">
        <h3 class="text-lg font-medium text-gray-900">Most Popular Articles</h3>
        <div class="mt-4">
          <table class="min-w-full divide-y divide-gray-200">
            <thead class="bg-gray-50">
              <tr>
                <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Title
                </th>
                <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Category
                </th>
                <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Views
                </th>
              </tr>
            </thead>
            <tbody id="popular-articles-table" class="bg-white divide-y divide-gray-200">
              <tr>
                <td colspan="3" class="px-6 py-4 text-center text-gray-500">
                  Loading popular articles...
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;
  
  // Load analytics data
  loadAnalyticsData();
}

async function loadAnalyticsData() {
  try {
    const response = await fetch('/api/knowledge/analytics');
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'Failed to load analytics data');
    }
    
    // Update stats
    document.getElementById('total-articles').textContent = data.totalArticles;
    document.getElementById('total-views').textContent = data.totalViews;
    document.getElementById('avg-views').textContent = data.averageViews.toFixed(1);
    
    // Render popular articles
    const tableBody = document.getElementById('popular-articles-table');
    
    if (!data.popularArticles || data.popularArticles.length === 0) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="3" class="px-6 py-4 text-center text-gray-500">
            No article view data available yet.
          </td>
        </tr>
      `;
      return;
    }
    
    tableBody.innerHTML = '';
    
    data.popularArticles.forEach(article => {
      const row = document.createElement('tr');
      
      row.innerHTML = `
        <td class="px-6 py-4 whitespace-nowrap">
          <div class="text-sm font-medium text-gray-900">${article.title}</div>
        </td>
        <td class="px-6 py-4 whitespace-nowrap">
          <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
            ${article.category ? article.category.name : 'Uncategorized'}
          </span>
        </td>
        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
          ${article.view_count}
        </td>
      `;
      
      tableBody.appendChild(row);
    });
  } catch (error) {
    console.error('Error loading analytics data:', error);
    showNotification('Error loading analytics data: ' + error.message, 'error');
  }
}

// Search and filters
function initSearchAndFilters() {
  const searchInput = document.getElementById('article-search');
  const categoryFilter = document.getElementById('article-category-filter');
  const statusFilter = document.getElementById('article-status-filter');
  
  // Debounce function to prevent too many API calls
  let searchTimeout;
  
  searchInput.addEventListener('input', function() {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      applyFilters();
    }, 300);
  });
  
  categoryFilter.addEventListener('change', applyFilters);
  statusFilter.addEventListener('change', applyFilters);
  
  // Load categories for filter
  loadCategoriesForFilter();
}

async function loadCategoriesForFilter() {
  try {
    const response = await fetch('/api/knowledge/categories');
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'Failed to load categories');
    }
    
    const categoryFilter = document.getElementById('article-category-filter');
    
    data.categories.forEach(category => {
      const option = document.createElement('option');
      option.value = category.slug;
      option.textContent = category.name;
      categoryFilter.appendChild(option);
    });
  } catch (error) {
    console.error('Error loading categories for filter:', error);
  }
}

async function applyFilters() {
  const searchQuery = document.getElementById('article-search').value;
  const categorySlug = document.getElementById('article-category-filter').value;
  const status = document.getElementById('article-status-filter').value;
  
  try {
    let url = '/api/knowledge/articles?';
    
    if (searchQuery) {
      url += `search=${encodeURIComponent(searchQuery)}&`;
    }
    
    if (categorySlug) {
      url += `category=${encodeURIComponent(categorySlug)}&`;
    }
    
    if (status) {
      url += `status=${encodeURIComponent(status)}&`;
    }
    
    const response = await fetch(url);
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'Failed to filter articles');
    }
    
    renderArticlesTable(data.articles);
  } catch (error) {
    console.error('Error filtering articles:', error);
    showNotification('Error filtering articles: ' + error.message, 'error');
  }
}

// Utility functions
function showNotification(message, type = 'info') {
  // Create notification element if it doesn't exist
  let notification = document.getElementById('notification');
  
  if (!notification) {
    notification = document.createElement('div');
    notification.id = 'notification';
    notification.className = 'fixed bottom-4 right-4 px-4 py-2 rounded-lg shadow-lg transform transition-transform duration-300 ease-in-out translate-y-full';
    document.body.appendChild(notification);
  }
  
  // Set notification type
  notification.className = 'fixed bottom-4 right-4 px-4 py-2 rounded-lg shadow-lg transform transition-transform duration-300 ease-in-out';
  
  if (type === 'success') {
    notification.className += ' bg-green-500 text-white';
  } else if (type === 'error') {
    notification.className += ' bg-red-500 text-white';
  } else {
    notification.className += ' bg-blue-500 text-white';
  }
  
  // Set message
  notification.textContent = message;
  
  // Show notification
  setTimeout(() => {
    notification.classList.remove('translate-y-full');
  }, 10);
  
  // Hide notification after 3 seconds
  setTimeout(() => {
    notification.classList.add('translate-y-full');
  }, 3000);
}

// Initialize article form
function initArticleForm() {
  // This function is called when the page loads
  // The actual form is created dynamically when needed
}

// Initialize category management
function initCategories() {
  // This function is called when the page loads
  // The actual category management UI is created dynamically when the tab is clicked
}

// Initialize tag management
function initTags() {
  // This function is called when the page loads
  // The actual tag management UI is created dynamically when the tab is clicked
}
