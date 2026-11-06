// Legacy static clients call the same authenticated account service as the host.
(function () {
  if (window.__eqAdminTransport) return;
  window.__eqAdminTransport = true;
  const hostname = location.hostname.toLowerCase();
  window.__eqServiceOrigin = /^(localhost|127\.0\.0\.1)$/.test(hostname) || hostname.endsWith('.lovable.app') ? location.origin : 'https://scheduquiz.lovable.app';
  const original = window.fetch.bind(window);
  const directory = async (headers) => {
    const response = await original(window.__eqServiceOrigin + '/api/public/admin/directory', { method: 'GET', headers });
    if (!response.ok) return { response };
    return { rows: await response.json() };
  };
  window.fetch = async function (input, init) {
    const req = new Request(input, init);
    const url = new URL(req.url);
    const path = url.pathname;
    const signedIn = req.headers.get('Authorization') && req.headers.get('Authorization') !== 'Bearer ' + req.headers.get('apikey');
    const fields = (url.searchParams.get('select') || '').split(',').map((field) => field.trim());
    if (signedIn && req.method === 'GET' && path.endsWith('/rest/v1/profiles') && fields.includes('full_name') && fields.every((field) => ['id', 'full_name', 'email', 'role'].includes(field))) {
      const result = await directory(req.headers);
      if (!result.rows) return result.response;
      let rows = result.rows;
      for (const field of ['id', 'role']) {
        const filter = url.searchParams.get(field);
        if (filter?.startsWith('eq.')) rows = rows.filter((row) => row[field] === filter.slice(3));
        if (filter?.startsWith('neq.')) rows = rows.filter((row) => row[field] !== filter.slice(4));
        if (filter?.startsWith('in.(')) {
          const values = filter.slice(4, -1).split(',');
          rows = rows.filter((row) => values.includes(row[field]));
        }
      }
      rows = rows.map((row) => Object.fromEntries(fields.filter((field) => field !== 'email').map((field) => [field, row[field]])));
      if (req.headers.get('Accept')?.includes('application/vnd.pgrst.object+json')) {
        return Response.json(rows.length === 1 ? rows[0] : { code: 'PGRST116', message: 'Directory entry not found', details: 'The result contains ' + rows.length + ' rows' }, { status: rows.length === 1 ? 200 : 406 });
      }
      return Response.json(rows);
    }
    if (signedIn && path.endsWith('/rest/v1/messages') && (url.searchParams.get('select') || '').includes('profiles!')) {
      const response = await original(input, init);
      if (!response.ok) return response;
      const payload = await response.clone().json();
      const result = await directory(req.headers);
      if (!result.rows) return response;
      const names = new Map(result.rows.map((row) => [row.id, row]));
      const hydrate = (message) => ({ ...message, sender: names.get(message.sender_id) || null, recipient: names.get(message.recipient_id) || null });
      return Response.json(Array.isArray(payload) ? payload.map(hydrate) : hydrate(payload), { status: response.status });
    }
    let endpoint;
    if (path.endsWith('/functions/v1/admin-manage-users')) endpoint = 'users';
    if (path.includes('/functions/v1/password-reset-admin/')) endpoint = 'resets/' + path.split('/').pop();
    if (!endpoint) return original(input, init);
    return original(window.__eqServiceOrigin + '/api/public/admin/' + endpoint, {
      method: req.method,
      headers: req.headers,
      ...(req.method !== 'GET' && req.method !== 'HEAD' ? { body: await req.text() } : {}),
    });
  };
})();