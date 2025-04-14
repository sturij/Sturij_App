let { data: template, error: templateError } = await supabase
      .from('email_templates')
      .select('*')
      .eq('key', templateKey)
      .eq('active', true)
      .single();