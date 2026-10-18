import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { resolve } from 'node:path'

const root = fileURLToPath(new URL('.', import.meta.url))

const base = process.env.BASE_PATH || '/'

/**
 * GitHub Pages serves 404.html for unknown paths. We use it to bounce
 * deep links back to index.html so the SPA router can take over.
 */
function githubPagesSpa(): Plugin {
  return {
    name: 'omnimath:github-pages-spa',
    apply: 'build',
    closeBundle() {
      const redirect = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="robots" content="noindex" />
    <title>Redirecting…</title>
    <script>
      (function () {
        var BASE = ${JSON.stringify(base)};
        var path = location.pathname;
        var rest = path.indexOf(BASE) === 0 ? path.slice(BASE.length) : path.replace(/^\\/+/, '');
        var target = BASE + '?/' + rest +
          (location.search ? '&' + location.search.slice(1) : '') + location.hash;
        try { sessionStorage.setItem('omnimath:redirect', target); } catch (e) {}
        location.replace(BASE);
      })();
    </script>
  </head>
  <body></body>
</html>
`
      writeFileSync(resolve(root, 'dist/404.html'), redirect)
      writeFileSync(resolve(root, 'dist/.nojekyll'), '')
      if (process.env.BASE_PATH || process.env.SITE_CNAME) {
        // no-op marker; CNAME is added manually once the domain is live
      }
    },
  }
}

export default defineConfig({
  base,
  plugins: [react(), tailwindcss(), githubPagesSpa()],
})
