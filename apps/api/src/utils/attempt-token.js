'use strict';

/**
 * Signed start tokens for timed assessments.
 *
 * ---------------------------------------------------------------------------
 * WHY A TOKEN AND NOT JUST A CLIENT TIMER
 * ---------------------------------------------------------------------------
 * A countdown in the browser is a courtesy to the person taking the quiz, not a
 * limit. It lives in JavaScript the candidate controls: pause it, edit it in
 * DevTools, or simply reload the page and it starts again. Anything enforced
 * only there is not enforced.
 *
 * So the clock starts on the SERVER. `POST /api/quizzes/:id/start` issues a
 * token that records who it was issued to, for which quiz, and when. The token
 * is signed, so the browser can hold it but cannot alter it - changing the
 * issued-at by a single second invalidates the signature. On submit the server
 * checks the signature and the elapsed time itself.
 *
 * It is deliberately STATELESS: no session table, no rows to clean up, and no
 * way for a half-finished attempt to leave litter behind. The trade is that a
 * token cannot be revoked before it expires, which is acceptable because the
 * only thing it authorises is submitting one quiz the user could already submit.
 */

const crypto = require('crypto');

/**
 * The signing key.
 *
 * Reuses JWT_SECRET, which is already required for the application to boot at
 * all, so there is no new secret to forget to set in production. Rotating it
 * invalidates in-flight assessments, which is the correct behaviour - a token
 * signed with a retired key should not be honoured.
 */
const secret = () => {
  const value = process.env.JWT_SECRET;
  if (!value) {
    throw new Error(
      '[assessment] JWT_SECRET is required to sign assessment start tokens'
    );
  }
  return value;
};

const sign = (payload) =>
  crypto.createHmac('sha256', secret()).update(payload).digest('base64url');

/**
 * Issues a start token.
 *
 * The payload is plain and readable on purpose - it carries no secret, and the
 * signature is what makes it trustworthy. Hiding the issue time would only make
 * it harder to debug without making it harder to forge.
 */
const issue = ({ quizId, userId, timeLimitSeconds }) => {
  const issuedAt = Date.now();
  const payload = [quizId, String(userId), String(issuedAt), String(timeLimitSeconds)].join('.');

  return {
    token: `${payload}.${sign(payload)}`,
    issuedAt,
    expiresAt: issuedAt + timeLimitSeconds * 1000,
  };
};

/**
 * Verifies a start token against the caller and the quiz.
 *
 * Returns a reason rather than throwing, because each failure means something
 * different to the person taking the quiz: a bad signature is tampering, an
 * expired one is simply out of time, and a mismatched user is a token that
 * belongs to somebody else.
 */
const verify = (token, { quizId, userId }) => {
  if (typeof token !== 'string' || token.length === 0) {
    return { valid: false, reason: 'missing' };
  }

  const parts = token.split('.');
  if (parts.length !== 5) return { valid: false, reason: 'malformed' };

  const [tokenQuizId, tokenUserId, issuedAtRaw, limitRaw, signature] = parts;
  const payload = [tokenQuizId, tokenUserId, issuedAtRaw, limitRaw].join('.');
  const expected = sign(payload);

  // Constant-time comparison. A plain === leaks how much of the signature was
  // correct through timing, which is enough to forge one byte at a time.
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return { valid: false, reason: 'tampered' };
  }

  if (tokenQuizId !== quizId) return { valid: false, reason: 'wrong-quiz' };
  if (tokenUserId !== String(userId)) return { valid: false, reason: 'wrong-user' };

  const issuedAt = Number(issuedAtRaw);
  const limit = Number(limitRaw);
  if (!Number.isFinite(issuedAt) || !Number.isFinite(limit)) {
    return { valid: false, reason: 'malformed' };
  }

  const elapsedSeconds = (Date.now() - issuedAt) / 1000;

  // A few seconds of slack, because the request itself takes time to arrive and
  // a candidate who submits on the final second should not lose their answers to
  // network latency.
  const GRACE_SECONDS = 5;
  if (elapsedSeconds > limit + GRACE_SECONDS) {
    return { valid: false, reason: 'expired', elapsedSeconds };
  }

  return { valid: true, issuedAt, limit, elapsedSeconds };
};

module.exports = { issue, verify };
