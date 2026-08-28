'use strict';

/**
 * Configures the Google sign-in provider from environment variables.
 *
 * Provider settings live in the DATABASE, in the users-permissions plugin store,
 * not in a config file. That is the same trap the roles had: configure it by
 * clicking in the admin panel and it exists only in whichever database you
 * clicked in, so production comes up with Google sign-in quietly switched off
 * and nothing in the repository explains why.
 *
 * So it is set here, on every boot, from environment variables. A fresh database
 * plus the right variables is a working Google sign-in with no manual step.
 *
 * Without GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET the provider is left
 * DISABLED rather than half-configured. A provider that is enabled with no
 * credentials fails at the redirect with an opaque error from Google; one that
 * is off simply does not offer the button.
 */

module.exports = async (strapi) => {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  const pluginStore = strapi.store({ type: 'plugin', name: 'users-permissions' });
  const grant = (await pluginStore.get({ key: 'grant' })) ?? {};

  if (!clientId || !clientSecret) {
    // Turn it off if it was previously on - removing the credentials should
    // remove the button, not leave a broken one behind.
    if (grant.google?.enabled) {
      await pluginStore.set({
        key: 'grant',
        value: { ...grant, google: { ...grant.google, enabled: false } },
      });
      strapi.log.warn(
        '[seed] GOOGLE_CLIENT_ID/SECRET are unset - Google sign-in disabled'
      );
    }
    return { enabled: false };
  }

  /**
   * Where Google sends the browser after consent.
   *
   * This is OUR frontend, not Strapi: the plugin redirects there with an
   * access_token in the query, and the frontend then exchanges it for a session.
   * It has to match a redirect URI registered in the Google console exactly -
   * a trailing slash or a wrong scheme is the usual cause of redirect_uri_mismatch.
   */
  const frontendUrl = (process.env.FRONTEND_URL || 'http://localhost:3000').replace(
    /\/+$/,
    ''
  );

  const desired = {
    ...grant.google,
    enabled: true,
    icon: 'google',
    key: clientId,
    secret: clientSecret,
    // Strapi's own callback, where Google returns first.
    callbackUrl: `${strapi.config.get('server.absoluteUrl')}/api/connect/google/callback`,
    scope: ['email', 'profile'],
    redirect_uri: `${frontendUrl}/connect/google/redirect`,
  };

  const current = grant.google ?? {};
  const unchanged =
    current.enabled === desired.enabled &&
    current.key === desired.key &&
    current.secret === desired.secret &&
    current.redirect_uri === desired.redirect_uri &&
    current.callbackUrl === desired.callbackUrl;

  if (unchanged) return { enabled: true, changed: false };

  await pluginStore.set({ key: 'grant', value: { ...grant, google: desired } });

  strapi.log.info('[seed] Google sign-in configured');
  return { enabled: true, changed: true };
};
