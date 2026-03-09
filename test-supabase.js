import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://irhdpsguhekzduqropln.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlyaGRwc2d1aGVremR1cXJvcGxuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMwMTc3NDEsImV4cCI6MjA4ODU5Mzc0MX0.6-qOSy5fyMYzlyFi-6e9Sci69-yk28MAj3xdEFjKAvw';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testConnection() {
  console.log('Testing connection to Supabase...');
  try {
    const { data, error } = await supabase.from('config').select('*').limit(1);
    
    if (error) {
      console.error('Connection failed with error:', error.message);
      process.exit(1);
    }
    
    console.log('Connection successful! Database responded.');
    console.log('Data sample:', data);
  } catch (err) {
    console.error('Unexpected error:', err);
  }
}

testConnection();
