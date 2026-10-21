// Legacy static clients call the same authenticated account service as the host.
(function () {
  if (window.__eqAdminTransport) return;
  window.__eqAdminTransport = true;
  const original = window.fetch.bind(window);
  window.fetch = async function (input, init) {
    const req = new Request(input, init);
    const path = new URL(req.url).pathname;
    let endpoint;
    if (path.endsWith('/functions/v1/admin-manage-users')) endpoint = 'users';
    if (path.includes('/functions/v1/password-reset-admin/')) endpoint = 'resets/' + path.split('/').pop();
    if (!endpoint) return original(input, init);
    const origin = /^(localhost|127\.0\.0\.1)$/.test(location.hostname) || location.hostname.endsWith('.lovable.app') ? location.origin : 'https://scheduquiz.lovable.app';
    return original(origin + '/api/public/admin/' + endpoint, {
      method: req.method,
      headers: req.headers,
      ...(req.method !== 'GET' && req.method !== 'HEAD' ? { body: await req.text() } : {}),
    });
  };
})();