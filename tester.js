const fs = require('fs');
const http = require('http');
const { createClient } = require('@supabase/supabase-js');

const envLocal = fs.readFileSync('.env.local', 'utf8');
const urlMatch = envLocal.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/);
const keyMatch = envLocal.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.*)/);

if (urlMatch && keyMatch) {
  const supabase = createClient(urlMatch[1].trim(), keyMatch[1].trim());
  supabase.from('contests').select('*').order('created_at', { ascending: false }).limit(1)
    .then(({ data }) => {
       const cid = data[0].id;
       http.get('http://localhost:3000/api/leaderboard?contest_id=' + cid, (res) => {
         let rawData = '';
         res.on('data', (chunk) => { rawData += chunk; });
         res.on('end', () => {
           console.log(JSON.stringify(JSON.parse(rawData), null, 2));
         });
       });
    });
}
