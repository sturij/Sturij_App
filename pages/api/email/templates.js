// pages/api/email/templates.js
import { supabase } from '../../../lib/supabaseClient';

export default async function handler(req, res) {
  // Check authentication
  const { data: { session }, error: authError } = await supabase.auth.getSession();

  if (authError || !session) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // Check if user is admin
  const { data: userData, error: userError } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', session.user.id)
    .single();

  if (userError || !userData?.is_admin) {
    return res.status(403).json({ error: 'Forbidden: Admin access required' });
  }

  // Handle different HTTP methods
  switch (req.method) {
    case 'GET':
      return getTemplates(req, res);
    case 'POST':
      return createTemplate(req, res, session.user.id);
    case 'PUT':
      return updateTemplate(req, res, session.user.id);
    case 'DELETE':
      return deleteTemplate(req, res, session.user.id);
    default:
      return res.status(405).json({ error: 'Method not allowed' });
  }
}

// Get all templates
async function getTemplates(req, res) {
  try {
    const { data: templates, error } = await supabase
      .from('email_templates')
      .select('*')
      .order('name', { ascending: true });

    if (error) throw error;

    return res.status(200).json({ templates });
  } catch (error) {
    console.error('Error getting templates:', error);
    return res.status(500).json({ error: 'Failed to get templates' });
  }
}

// Create a new template
async function createTemplate(req, res, userId) {
  try {
    const { key, name, subject, content, description, active } = req.body;

    if (!key || !name || !subject || !content) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Check if template key already exists
    const { data: existingTemplate, error: checkError } = await supabase
      .from('email_templates')
      .select('id')
      .eq('key', key)
      .single();

    if (existingTemplate) {
      return res.status(409).json({ error: 'Template key already exists' });
    }

    // Create template
    const { data: template, error } = await supabase
      .from('email_templates')
      .insert([
        {
          key,
          name,
          subject,
          content,
          description: description || '',
          active: active !== false,
          created_by: userId,
          updated_by: userId
        }
      ])
      .select()
      .single();

    if (error) throw error;

    return res.status(201).json({ template });
  } catch (error) {
    console.error('Error creating template:', error);
    return res.status(500).json({ error: 'Failed to create template' });
  }
}

// Update an existing template
async function updateTemplate(req, res, userId) {
  try {
    const { id, key, name, subject, content, description, active } = req.body;

    if (!id || !key || !name || !subject || !content) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Check if template exists
    const { data: existingTemplate, error: checkError } = await supabase
      .from('email_templates')
      .select('id')
      .eq('id', id)
      .single();

    if (checkError || !existingTemplate) {
      return res.status(404).json({ error: 'Template not found' });
    }

    // Update template
    const { data: template, error } = await supabase
      .from('email_templates')
      .update({
        key,
        name,
        subject,
        content,
        description: description || '',
        active: active !== false,
        updated_at: new Date().toISOString(),
        updated_by: userId
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return res.status(200).json({ template });
  } catch (error) {
    console.error('Error updating template:', error);
    return res.status(500).json({ error: 'Failed to update template' });
  }
}

// Delete a template
async function deleteTemplate(req, res, userId) {
  try {
    const { id } = req.query;

    if (!id) {
      return res.status(400).json({ error: 'Template ID is required' });
    }

    // Check if template exists
    const { data: existingTemplate, error: checkError } = await supabase
      .from('email_templates')
      .select('id')
      .eq('id', id)
      .single();

    if (checkError || !existingTemplate) {
      return res.status(404).json({ error: 'Template not found' });
    }

    // Delete template
    const { error } = await supabase
      .from('email_templates')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error deleting template:', error);
    return res.status(500).json({ error: 'Failed to delete template' });
  }
}