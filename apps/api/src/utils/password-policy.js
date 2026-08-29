'use strict';

/**
 * What counts as an acceptable password. The BACKEND copy.
 *
 * There is a second copy of these rules in apps/web/src/lib/password-policy.ts,
 * and that duplication is deliberate rather than lazy: the two apps are
 * separate packages with separate runtimes, and the browser cannot import from
 * the Strapi project. The frontend copy exists to tell somebody what is wrong
 * while they type. THIS copy is the one that decides, because a rule enforced
 * only in a form is not a rule - anything can POST to the API.
 *
 * If you change one, change the other. The rule list and the wording are kept
 * identical on purpose, so a person never sees the form accept what the server
 * then rejects.
 */

const MIN_LENGTH = 8;

/**
 * The punctuation that counts as "special", written out rather than expressed
 * as a regex range.
 *
 * A character class containing - ] \ ^ and quotes is a well-known source of
 * silent bugs: escape one wrongly and the class quietly matches something else
 * entirely, with no error to notice. Membership in a plain string cannot go
 * wrong that way, and it doubles as the list shown to the user.
 */
const SPECIALS =
  '~!@#$%^&*_-+=' + '`' + '|' + '\\' + '(){}[]' + ':;' + '"' + "'" + '<>,.?/';

const RULES = [
  {
    id: 'length',
    label: `At least ${MIN_LENGTH} characters`,
    test: (value) => value.length >= MIN_LENGTH,
  },
  {
    id: 'lowercase',
    label: 'A lowercase letter',
    test: (value) => /[a-z]/.test(value),
  },
  {
    id: 'uppercase',
    label: 'An uppercase letter',
    test: (value) => /[A-Z]/.test(value),
  },
  {
    id: 'number',
    label: 'A number',
    test: (value) => /[0-9]/.test(value),
  },
  {
    id: 'special',
    label: `A symbol (${SPECIALS})`,
    test: (value) => [...value].some((character) => SPECIALS.includes(character)),
  },
];

/** Every rule the value fails, in order. Empty means it is acceptable. */
const failedRules = (value) =>
  typeof value === 'string' ? RULES.filter((rule) => !rule.test(value)) : RULES;

/**
 * One sentence naming what is missing.
 *
 * Listing every failure at once rather than the first one: a form that reveals
 * its rules one rejection at a time turns choosing a password into a guessing
 * game.
 */
const describeFailure = (value) => {
  const failed = failedRules(value);
  if (failed.length === 0) return null;

  const missing = failed.map((rule) => rule.label.toLowerCase());

  return `Your password needs ${missing.slice(0, -1).join(', ')}${
    missing.length > 1 ? ' and ' : ''
  }${missing[missing.length - 1]}.`;
};

module.exports = { MIN_LENGTH, SPECIALS, RULES, failedRules, describeFailure };
