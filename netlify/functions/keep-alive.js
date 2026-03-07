// Netlify serverless function to keep Supabase database active
// Set up a free cron job at cron-job.org to hit this every 3 days

const { createClient } = require('@supabase/supabase-js');

exports.handler = async (event) => {
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Supabase not configured' }),
    };
  }
  
  try {
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Simple query to keep the database active
    const { data, error } = await supabase
      .from('cards')
      .select('id')
      .limit(1);
    
    if (error) {
      console.error('Keep-alive ping failed:', error);
      return {
        statusCode: 500,
        body: JSON.stringify({ error: error.message }),
      };
    }
    
    const timestamp = new Date().toISOString();
    console.log(`Keep-alive ping successful at ${timestamp}`);
    
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        status: 'ok', 
        message: 'Supabase is alive!',
        timestamp,
      }),
    };
    
  } catch (error) {
    console.error('Keep-alive error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};
