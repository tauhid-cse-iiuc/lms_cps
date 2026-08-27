'use strict';

const { isAdmin } = require('../utils/authorization');

/**
 * Admin only.
 *
 * Guards the endpoints that can change who other people are - role assignment,
 * user deletion, platform statistics. The permission matrix already stops a
 * Student calling these at all; this is the second lock, on the routes where
 * being wrong is most expensive.
 *
 * "Admin" here means the application role seeded into Users & Permissions, NOT
 * a Strapi Super Admin. They are unrelated systems: this one governs the REST
 * API, the other governs the /admin control panel, and an application Admin has
 * no access to /admin at all.
 */
module.exports = (policyContext) => isAdmin(policyContext);
