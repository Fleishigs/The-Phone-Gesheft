const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://xfswosnhewblxdtvtbcz.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

exports.handler = async (event, context) => {
  try {
    // Simple query to keep database active
    const { data, error } = await supabase
      .from('products')
      .select('id')
      .limit(1);

    if (error) {
      console.error('Keep-alive error:', error);
      return {
        statusCode: 500,
        body: JSON.stringify({ error: error.message })
      };
    }

    console.log('Keep-alive ping successful:', new Date().toISOString());
    
    return {
      statusCode: 200,
      body: JSON.stringify({ 
        success: true, 
        timestamp: new Date().toISOString(),
        message: 'Database pinged successfully'
      })
    };
  } catch (err) {
    console.error('Keep-alive exception:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message })
    };
  }
};
