async function ingest(deals, supabaseClient) {
  const result = { inserted: 0, skipped: 0, errors: [] };

  if (!Array.isArray(deals) || deals.length === 0) {
    return result;
  }

  if (!supabaseClient) {
    return {
      ...result,
      errors: ['Missing supabase client'],
    };
  }

  const urls = deals
    .map((deal) => (deal?.source_url || '').trim())
    .filter(Boolean);

  const existingUrls = new Set();
  if (urls.length) {
    const { data, error } = await supabaseClient
      .from('penny_deals')
      .select('source_url')
      .in('source_url', urls);

    if (error) {
      result.errors.push(error.message);
      return result;
    }

    for (const row of data || []) {
      if (row.source_url) existingUrls.add(row.source_url);
    }
  }

  const toInsert = [];
  for (const deal of deals) {
    const sourceUrl = (deal?.source_url || '').trim();
    if (sourceUrl && existingUrls.has(sourceUrl)) {
      result.skipped += 1;
      continue;
    }

    if (sourceUrl) {
      existingUrls.add(sourceUrl);
    }
    toInsert.push(deal);
  }

  if (!toInsert.length) {
    return result;
  }

  const { data, error } = await supabaseClient
    .from('penny_deals')
    .insert(toInsert)
    .select('id');

  if (error) {
    result.errors.push(error.message);
    return result;
  }

  result.inserted = data?.length || 0;
  return result;
}

module.exports = { ingest };
