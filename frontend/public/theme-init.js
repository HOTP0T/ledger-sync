/*
 * Applies the theme before first paint, so the page never flashes the wrong one.
 * A separate file, not an inline <script>: the module container's CSP is
 * script-src 'self'. Keep it in step with src/lib/gnos3Embed.ts and src/lib/theme.ts.
 *
 * Inside Gnos3 the theme comes from Gnos3: /sso?gnos3_token=...&theme=light|dark&lang=...
 * (kept in sessionStorage for the frame's session); otherwise from the user's own
 * choice (localStorage), and the OS when there is neither.
 */
(function () {
  var root = document.documentElement
  var ss = null
  var ls = null
  try { ss = window.sessionStorage } catch (e) { /* storage blocked */ }
  try { ls = window.localStorage } catch (e) { /* storage blocked */ }
  function get(store, key) {
    try { return store ? store.getItem(key) : null } catch (e) { return null }
  }
  function put(store, key, value) {
    try { if (store) store.setItem(key, value) } catch (e) { /* storage blocked */ }
  }

  var framed
  try { framed = window.self !== window.top } catch (e) { framed = true }

  var q = new URLSearchParams(window.location.search)
  if (q.has('gnos3_token')) {
    if (framed) put(ss, 'gnos3-embed', '1')
    var t = q.get('theme')
    if (t === 'light' || t === 'dark') put(ss, 'gnos3-theme', t)
    var l = q.get('lang')
    if (l && /^[A-Za-z]{2,3}(-[A-Za-z0-9]{2,8})*$/.test(l)) put(ss, 'gnos3-lang', l)
  }

  var inside = framed && get(ss, 'gnos3-embed') === '1'
  var hint = get(ss, 'gnos3-theme')
  var mode = hint === 'light' || hint === 'dark' ? hint : inside ? 'system' : get(ls, 'ledger-sync-theme')
  if (mode !== 'light' && mode !== 'dark' && mode !== 'system') mode = 'system'
  var resolved = mode
  if (mode === 'system') {
    resolved = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  }
  root.setAttribute('data-theme', resolved)

  var locale = get(ss, 'gnos3-lang')
  if (locale) root.setAttribute('data-locale', locale)

  var bar = document.querySelector('meta[name="theme-color"]')
  if (bar) bar.setAttribute('content', resolved === 'dark' ? '#0A1019' : '#ffffff')
  var scheme = document.querySelector('meta[name="color-scheme"]')
  if (scheme) scheme.setAttribute('content', resolved)
})()
