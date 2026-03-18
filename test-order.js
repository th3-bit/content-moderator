import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function run() {
  const { data: topics, error: fetchError } = await supabase.from('topics').select('*').limit(2);
  console.log('fetched topics:', topics);
  if (topics && topics.length > 0) {
    const id = topics[0].id;
    console.log('updating topic id:', id);
    const { data, error } = await supabase.from('topics').update({ order_index: 99 }).eq('id', id).select();
    console.log('update result:', data, error);
  } else {
    console.log('fetch error:', fetchError);
  }
}
run();
