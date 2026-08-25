/**
 * Reads PUBLIC_URL and refuses to boot if it is set but malformed.
 *
 * Why this guard exists: Strapi decides how to interpret server.url by testing
 * `serverUrl.startsWith('http')` (see @strapi/core/dist/configuration/urls.js).
 * If the value has no scheme, Strapi assumes it is a sub-folder path rather than
 * an address, prepends a "/", and stamps it onto every admin-panel asset URL -
 * so index.html ends up requesting
 *   /my-app.up.railway.app/admin/strapi-<hash>.js   (404)
 * instead of
 *   /admin/strapi-<hash>.js                         (200)
 * The admin panel then renders a blank white page with no error, because the
 * HTML loaded fine and only the JavaScript went missing.
 *
 * That failure is silent and costs an hour to find, so we turn it into a loud
 * one at startup instead.
 */
const readPublicUrl = (env) => {
  const raw = env('PUBLIC_URL', '').trim();

  // Not set: correct for local development. Strapi falls back to localhost.
  if (raw === '') return undefined;

  if (!/^https?:\/\//.test(raw)) {
    throw new Error(
      `Invalid PUBLIC_URL: "${raw}"\n` +
        `PUBLIC_URL must start with http:// or https://\n` +
        `Strapi treats a scheme-less value as a URL path, which breaks every ` +
        `admin-panel asset URL and serves a blank page.\n` +
        `Set it to e.g. https://${raw.replace(/^\/+/, '')}`
    );
  }

  // A trailing slash is harmless (Strapi trims it) but normalise anyway so the
  // value logged at boot matches the value used.
  return raw.replace(/\/+$/, '');
};

module.exports = ({ env }) => ({
  host: env('HOST', '0.0.0.0'),
  // Railway assigns the port at runtime and injects it as PORT.
  port: env.int('PORT', 1337),

  // Public URL of this API. Locally this is undefined and Strapi falls back to
  // localhost. In production it must be the full Railway domain *including the
  // https:// scheme* - see readPublicUrl above for what happens otherwise.
  url: readPublicUrl(env),

  // Railway terminates HTTPS at its edge and forwards plain HTTP internally.
  // Without this, Strapi sees an http request and generates http:// links and
  // non-Secure cookies, which browsers then reject on an https page.
  proxy: env.bool('IS_PROXIED', false),

  app: {
    keys: env.array('APP_KEYS'),
  },
  webhooks: {
    populateRelations: env.bool('WEBHOOKS_POPULATE_RELATIONS', false),
  },
});
