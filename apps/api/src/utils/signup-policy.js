'use strict';

/**
 * Which email addresses may become accounts.
 *
 * ---------------------------------------------------------------------------
 * ONE GATE, NOT THREE
 * ---------------------------------------------------------------------------
 * There are several routes to a new user - the password sign-up form, the Google
 * provider callback, and anything added later - and a rule enforced separately
 * on each is a rule that will eventually be missed on one of them. So the check
 * lives on CREATION itself, as a lifecycle on the user model, and every path
 * passes through it whether it knows about the rule or not.
 *
 * The obvious alternative, validating inside the register controller, would have
 * left Google sign-up wide open: that path never touches the register
 * controller. It creates the user deep inside the plugin's provider service,
 * after the profile comes back from Google.
 *
 * ---------------------------------------------------------------------------
 * THE BYPASS
 * ---------------------------------------------------------------------------
 * The seed creates four demo accounts on @lms.test, which the policy would
 * otherwise reject and take the whole boot down with it. Rather than punching a
 * permanent hole in the allow-list - which would let anyone self-register as
 * someone@lms.test - the seed asks for an explicit, scoped exemption.
 *
 * The flag is module-level, which is only safe because of WHEN it is used: the
 * seed runs during bootstrap, before the HTTP server accepts a single request,
 * so no other creation can be in flight to be wrongly exempted. It would not be
 * safe to reach for this from a request handler.
 */

const DEFAULT_DOMAINS = ['gmail.com', 'googlemail.com'];

let bypassing = false;

/**
 * The allowed domains.
 *
 * googlemail.com is included with gmail.com because they are the same mailbox -
 * Google treats them interchangeably, and rejecting one while accepting the
 * other would turn a policy into a coin toss for the people who happen to have
 * the older address.
 */
const allowedDomains = () => {
  const configured = (process.env.SIGNUP_ALLOWED_DOMAINS || '')
    .split(',')
    .map((d) => d.trim().toLowerCase())
    .filter(Boolean);

  return configured.length > 0 ? configured : DEFAULT_DOMAINS;
};

const domainOf = (email) =>
  typeof email === 'string' && email.includes('@')
    ? email.split('@').pop().trim().toLowerCase()
    : null;

const isAllowed = (email) => {
  const domain = domainOf(email);
  if (!domain) return false;
  return allowedDomains().includes(domain);
};

/** Human-readable, for the message a rejected sign-up actually sees. */
const describeAllowed = () => {
  const domains = allowedDomains().map((d) => `@${d}`);
  if (domains.length === 1) return domains[0];
  return `${domains.slice(0, -1).join(', ')} or ${domains[domains.length - 1]}`;
};

/** Runs `fn` with the policy suspended. Bootstrap only - see the note above. */
const withoutPolicy = async (fn) => {
  bypassing = true;
  try {
    return await fn();
  } finally {
    bypassing = false;
  }
};

const isBypassing = () => bypassing;

module.exports = {
  allowedDomains,
  isAllowed,
  describeAllowed,
  withoutPolicy,
  isBypassing,
};
