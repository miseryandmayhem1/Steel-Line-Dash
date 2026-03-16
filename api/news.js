const QUERIES = {
  'armada':     'Armada Systems edge AI',
  'packsmith':  'Packsmith fulfillment',
  'persona':    'Persona AI humanoid robot',
  'valar':      'Valar Atomics nuclear',
  'groq':       'Groq AI chip',
  'databricks': 'Databricks',
  'spacex':     'SpaceX',
  'openai':     'OpenAI',
};

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { id, name } = req.body || {};
  if (!id) return res.status(400).json({ error: 'Missing id' });

  const q = QUERIES[id] || name;
  const encoded = encodeURIComponent(q);

  // Google News RSS - free, no key, broad coverage including small companies
  const rssUrl = `https://news.google.com/rss/search?q=${encoded}&hl=en-US&gl=US&ceid=US:en`;

  try {
    const r = await fetch(rssUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });

    if (!r.ok) return res.status(502).json({ error: `RSS fetch failed: ${r.status}` });

    const xml = await r.text();

    // Parse first item from RSS
    const itemMatch = xml.match(/<item>([\s\S]*?)<\/item>/);
    if (!itemMatch) return res.status(200).json({ empty: true });

    const item = itemMatch[1];

    const titleMatch = item.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/) || item.match(/<title>(.*?)<\/title>/);
    const linkMatch  = item.match(/<link>(.*?)<\/link>/) || item.match(/<link\/>(.*?)<\/link>/);
    const dateMatch  = item.match(/<pubDate>(.*?)<\/pubDate>/);
    const sourceMatch = item.match(/<source[^>]*>(.*?)<\/source>/);

    const title = titleMatch?.[1]?.replace(/<[^>]+>/g, '').trim();
    const link  = linkMatch?.[1]?.trim();
    const date  = dateMatch?.[1]
      ? new Date(dateMatch[1]).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
      : '';
    const source = sourceMatch?.[1]?.trim() || '';

    if (!title) return res.status(200).json({ empty: true });

    // Strip " - Source Name" suffix Google appends to titles
    const cleanTitle = title.replace(/\s+-\s+[^-]+$/, '').trim();

    return res.status(200).json({ headline: cleanTitle, date, source, url: link || '#' });

  } catch(e) {
    console.error(`[${name}]`, e.message);
    return res.status(500).json({ error: e.message });
  }
};
