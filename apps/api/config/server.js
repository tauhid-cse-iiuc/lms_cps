module.exports = ({ env }) => ({
  host: env('HOST', '0.0.0.0'),
  // Railway assigns the port at runtime and injects it as PORT.
  port: env.int('PORT', 1337),

  // Public URL of this API. Locally this is undefined and Strapi falls back to
  // localhost. In production it must be the Railway domain, otherwise the admin
  // panel builds asset and redirect URLs pointing at the wrong host.
  url: env('PUBLIC_URL', undefined),

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
