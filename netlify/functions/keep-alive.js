const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://xfswosnhewblxdtvtbcz.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhmc3dvc25oZXdibHhkdHZ0YmN6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUxNDg5NjEsImV4cCI6MjA4MDcyNDk2MX0.xghqZwlpxQ6Gu0nz98wVUOOtz-Hqiw5NPNJ0mAE9TLc';
const supabase = createClient(supabaseUrl, supabaseKey);

exports.handler = async (event, context) => {
  const timestamp = new Date().toISOString();
  console.log('Keep-alive ping started:', timestamp);
  
  try {
    // Query multiple tables to keep database active
    const results = await Promise.all([
      supabase.from('products').select('id').limit(1),
      supabase.from('orders').select('id').limit(1),
      supabase.from('categories').select('id').limit(1),
      supabase.from('tags').select('id').limit(1)
    ]);

    // Check for errors
    const errors = results.filter(r => r.error).map(r => r.error.message);
    if (errors.length > 0) {
      console.error('Keep-alive errors:', errors);
      return {
        statusCode: 500,
        body: JSON.stringify({ 
          success: false,
          errors: errors,
          timestamp: timestamp
        })
      };
    }

    console.log('Keep-alive successful - all tables pinged:', timestamp);
    
    return {
      statusCode: 200,
      body: JSON.stringify({ 
        success: true, 
        timestamp: timestamp,
        tablesChecked: ['products', 'orders', 'categories', 'tags'],
        message: 'Database is awake and active'
      })
    };
  } catch (err) {
    console.error('Keep-alive exception:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        success: false,
        error: err.message,
        timestamp: timestamp
      })
    };
  }
};
