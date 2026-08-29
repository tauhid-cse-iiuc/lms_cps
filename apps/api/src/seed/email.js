'use strict';

/**
 * Email settings and templates, applied on every boot.
 *
 * Two things live in the database that most people configure by clicking:
 * the `advanced` settings that switch email confirmation on, and the `email`
 * templates the plugin sends. Both are seeded here for the same reason the
 * roles and the Google provider are - a setting that exists only in the
 * database somebody clicked in is a setting production does not have.
 *
 * The switch is SMTP itself. Turning email confirmation on without a working
 * mailer is the worst of the three states: registration succeeds, no mail is
 * sent, and the account can never sign in - a dead end with no error to read.
 * So confirmation follows the credentials. No SMTP, no confirmation, and
 * sign-up keeps working exactly as it did.
 */

const { htmlTemplate } = require('../utils/email-template');

/** Where the browser is sent after a link in one of these emails is clicked. */
const frontendUrl = () =>
  (process.env.FRONTEND_URL || 'http://localhost:3000').replace(/\/+$/, '');

const isMailConfigured = () =>
  Boolean(process.env.SMTP_USERNAME && process.env.SMTP_PASSWORD);

/**
 * The name and address every one of these emails comes from.
 *
 * Gmail rewrites the envelope sender to the authenticated account no matter
 * what is set here, so this has to agree with SMTP_USERNAME or the header and
 * the actual sender disagree - which is exactly the pattern spam filters score
 * against.
 */
const sender = () => ({
  name: process.env.EMAIL_FROM_NAME || 'LMS',
  email: process.env.EMAIL_FROM || process.env.SMTP_USERNAME || '',
});

/**
 * The confirmation email.
 *
 * `<%= URL %>?confirmation=<%= CODE %>` is not decoration: the plugin renders
 * this string with lodash's template function and fills URL and CODE itself.
 * URL points at the BACKEND - /api/auth/email-confirmation - which marks the
 * account confirmed and then redirects to the frontend. Pointing it at the
 * frontend instead would give the reader a link that confirms nothing.
 */
const confirmationTemplate = () => ({
  display: 'Email.template.email_confirmation',
  icon: 'check-square',
  options: {
    from: sender(),
    response_email: '',
    object: 'Confirm your <%= USER.username %> account',
    message: htmlTemplate({
      heading: 'Confirm your email address',
      body: [
        'Hello <%= USER.username %>,',
        'An account was created with this address. Confirm it to finish signing up - the link is good for one use.',
      ],
      action: { label: 'Confirm my email', href: '<%= URL %>?confirmation=<%= CODE %>' },
      footer:
        'If you did not create this account you can ignore this email; nothing will happen until the link is used.',
    }),
  },
});

/**
 * The password reset email.
 *
 * Here URL points at the FRONTEND - the reset form - because the code has to be
 * typed into a password field before anything is changed. A backend link would
 * reset a password on click, which means anything that visits links in a
 * mailbox (a scanner, a preview pane) would burn the token.
 */
const resetTemplate = () => ({
  display: 'Email.template.reset_password',
  icon: 'sync',
  options: {
    from: sender(),
    response_email: '',
    object: 'Reset your password',
    message: htmlTemplate({
      heading: 'Reset your password',
      body: [
        'Hello <%= USER.username %>,',
        'Someone asked to reset the password on this account. Choose a new one with the button below.',
      ],
      action: { label: 'Choose a new password', href: '<%= URL %>?code=<%= TOKEN %>' },
      footer:
        'If this was not you, ignore this email - your current password still works, and the link stops working once it is used.',
    }),
  },
});

module.exports = async (strapi) => {
  const pluginStore = strapi.store({ type: 'plugin', name: 'users-permissions' });
  const mailEnabled = isMailConfigured();

  /* ---- advanced settings ------------------------------------------------ */

  const advanced = (await pluginStore.get({ key: 'advanced' })) ?? {};

  const desiredAdvanced = {
    ...advanced,
    email_confirmation: mailEnabled,
    // Where the backend sends the browser once the address is confirmed. The
    // query flag is what the sign-in page reads to say "that worked" rather
    // than dropping the person on a form with no explanation.
    email_confirmation_redirection: `${frontendUrl()}/login?confirmed=1`,
    // The <%= URL %> of the reset email, so the token lands on our form.
    email_reset_password: `${frontendUrl()}/reset-password`,
  };

  const advancedChanged =
    advanced.email_confirmation !== desiredAdvanced.email_confirmation ||
    advanced.email_confirmation_redirection !==
      desiredAdvanced.email_confirmation_redirection ||
    advanced.email_reset_password !== desiredAdvanced.email_reset_password;

  if (advancedChanged) {
    await pluginStore.set({ key: 'advanced', value: desiredAdvanced });
  }

  /* ---- templates -------------------------------------------------------- */

  const emails = (await pluginStore.get({ key: 'email' })) ?? {};

  const desiredEmails = {
    ...emails,
    email_confirmation: confirmationTemplate(),
    reset_password: resetTemplate(),
  };

  const emailsChanged =
    JSON.stringify(emails.email_confirmation) !==
      JSON.stringify(desiredEmails.email_confirmation) ||
    JSON.stringify(emails.reset_password) !== JSON.stringify(desiredEmails.reset_password);

  if (emailsChanged) {
    await pluginStore.set({ key: 'email', value: desiredEmails });
  }

  if (!mailEnabled) {
    strapi.log.warn(
      '[seed] SMTP_USERNAME/SMTP_PASSWORD are unset - email confirmation is OFF and password reset emails will fail'
    );
  } else if (advancedChanged || emailsChanged) {
    strapi.log.info('[seed] email templates and confirmation settings updated');
  }

  return { mailEnabled, advancedChanged, emailsChanged };
};
