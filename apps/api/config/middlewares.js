module.exports = ({ env }) => [
  'strapi::logger',
  'strapi::errors',
  'strapi::security',
  {
    name: 'strapi::cors',
    config: {
      // Browsers block cross-origin requests unless the server explicitly allows them.
      // Locally that is the Next.js dev server; in production it is the Vercel domain,
      // supplied through the CORS_ORIGINS environment variable as a comma-separated list.
      origin: env('CORS_ORIGINS', 'http://localhost:3000')
        .split(',')
        .map((o) => o.trim())
        .filter(Boolean),
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'],
      headers: ['Content-Type', 'Authorization', 'Origin', 'Accept'],
      credentials: true,
    },
  },
  'strapi::poweredBy',
  'strapi::query',
  'strapi::body',
  'strapi::session',
  'strapi::favicon',
  'strapi::public',
];
