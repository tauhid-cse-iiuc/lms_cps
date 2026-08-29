'use strict';

/**
 * One HTML shell for every email this application sends.
 *
 * Email HTML is not web HTML. There is no shared stylesheet, no <style> block
 * that survives Gmail's sanitiser reliably, and no flexbox - so everything here
 * is inline styles on tables, which is the layout that renders the same in
 * Outlook, Gmail and Apple Mail. It looks like 2005 because that is what the
 * clients still agree on.
 *
 * The strings passed in are lodash templates rendered LATER by the
 * users-permissions plugin, which fills <%= USER.username %>, <%= URL %> and
 * <%= TOKEN %>. So nothing here interpolates anything itself: it concatenates,
 * and the placeholders travel through untouched.
 */

const INK = '#1c2024';
const MUTED = '#5b6470';
const BRAND = '#4f46e5';
const BORDER = '#e4e7ec';

/**
 * @param {object} parts
 * @param {string} parts.heading   Title line inside the card.
 * @param {string[]} parts.body    Paragraphs, in order.
 * @param {{label: string, href: string}} parts.action  The single button.
 * @param {string} parts.footer    Small print under the divider.
 */
const htmlTemplate = ({ heading, body, action, footer }) => `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5f6f8;margin:0;padding:32px 12px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <tr>
    <td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border:1px solid ${BORDER};border-radius:12px;">
        <tr>
          <td style="padding:28px 32px 8px 32px;">
            <p style="margin:0;font-size:13px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:${BRAND};">LMS</p>
            <h1 style="margin:12px 0 0 0;font-size:21px;line-height:1.3;color:${INK};">${heading}</h1>
          </td>
        </tr>
        <tr>
          <td style="padding:8px 32px 0 32px;">
            ${body
              .map(
                (paragraph) =>
                  `<p style="margin:14px 0 0 0;font-size:15px;line-height:1.6;color:${MUTED};">${paragraph}</p>`
              )
              .join('')}
          </td>
        </tr>
        <tr>
          <td style="padding:24px 32px 4px 32px;">
            <a href="${action.href}" style="display:inline-block;background:${BRAND};color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;padding:12px 22px;border-radius:8px;">${action.label}</a>
          </td>
        </tr>
        <tr>
          <td style="padding:18px 32px 0 32px;">
            <p style="margin:0;font-size:13px;line-height:1.6;color:${MUTED};">
              If the button does not work, copy this address into your browser:<br>
              <span style="color:${INK};word-break:break-all;">${action.href}</span>
            </p>
          </td>
        </tr>
        <tr>
          <td style="padding:20px 32px 28px 32px;">
            <p style="margin:20px 0 0 0;padding-top:16px;border-top:1px solid ${BORDER};font-size:12px;line-height:1.6;color:${MUTED};">${footer}</p>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
`.trim();

module.exports = { htmlTemplate };
