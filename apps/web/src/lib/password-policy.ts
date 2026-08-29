/**
 * What counts as an acceptable password. The BROWSER copy.
 *
 * The authoritative copy is apps/api/src/utils/password-policy.js. This one
 * exists so the form can say what is missing while somebody types, and it is
 * kept word-for-word identical to the backend's rules and labels - if the two
 * ever drift, a person sees a form accept what the server then rejects, which
 * is worse than having no client-side check at all.
 */

export const MIN_LENGTH = 8;

/**
 * Written as a plain string rather than a regex character class: a class
 * containing - ] \ ^ and both quote marks is easy to escape wrongly and fails
 * silently. Membership in a string cannot, and the same value doubles as the
 * list shown to the reader.
 */
export const SPECIALS =
  '~!@#$%^&*_-+=' + '`' + '|' + String.fromCharCode(92) + '(){}[]:;' + '"' + "'" + '<>,.?/';

export type PasswordRule = {
  id: string;
  label: string;
  test: (value: string) => boolean;
};

export const RULES: PasswordRule[] = [
  {
    id: 'length',
    label: `At least ${MIN_LENGTH} characters`,
    test: (value) => value.length >= MIN_LENGTH,
  },
  { id: 'lowercase', label: 'A lowercase letter', test: (v) => /[a-z]/.test(v) },
  { id: 'uppercase', label: 'An uppercase letter', test: (v) => /[A-Z]/.test(v) },
  { id: 'number', label: 'A number', test: (v) => /[0-9]/.test(v) },
  {
    id: 'special',
    label: 'A symbol',
    test: (value) => [...value].some((character) => SPECIALS.includes(character)),
  },
];

/** Every rule the value fails, in order. Empty means it is acceptable. */
export const failedRules = (value: string): PasswordRule[] =>
  RULES.filter((rule) => !rule.test(value));

export const passwordIsValid = (value: string): boolean =>
  failedRules(value).length === 0;
