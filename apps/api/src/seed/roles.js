'use strict';

const { ROLES, MANAGED_CONTENT_TYPES, DEFAULT_ROLE_TYPE } = require('./permission-matrix');

/**
 * Creates the application's roles and applies the permission matrix.
 *
 * Why this exists at all: Users & Permissions roles and their permissions are
 * rows in the database, not files in the repository. Deploying this codebase
 * against an empty database therefore produces an application with only Strapi's
 * built-in Public and Authenticated roles - no Admin, no Instructor, no Student -
 * and every login fails. Nothing in the source tree would tell you why.
 *
 * So the roles are built by code that runs on every boot. That makes the
 * deployment reproducible: a fresh database plus this repository is a working
 * application, with no step that depends on someone having clicked the right
 * checkboxes in a UI once and remembered to do it again next time.
 *
 * Runs on EVERY startup, so it has to be idempotent - safe to run repeatedly,
 * doing nothing when everything is already correct.
 */

/**
 * Decides whether the seed owns a given permission row.
 *
 * The seed cannot simply delete every permission it did not create. Strapi's own
 * bootstrap grants Public the endpoints that make registration and login work
 * (auth.register, auth.callback, auth.resetPassword). Wiping those would lock
 * everybody out of the application permanently, which is a spectacular way to
 * fail: the app boots cleanly, serves pages, and refuses every credential.
 *
 * But an add-only seed is wrong too. Deleting a line from the permission matrix
 * would then have no effect on an already-deployed database - the permission
 * would quietly stay granted, and the matrix in the repository would stop
 * describing the system actually running. A permission model you cannot tighten
 * is not a permission model.
 *
 * So the seed claims a bounded set of actions and reconciles only inside it:
 * everything on the seven content types this application defines, plus the
 * specific plugin endpoints the matrix hands out. Strapi's auth defaults fall
 * outside that boundary and are left alone.
 */
const buildManagedActionTest = () => {
  const prefixes = MANAGED_CONTENT_TYPES.map((uid) => `${uid}.`);
  const explicit = new Set(ROLES.flatMap((role) => role.permissions));

  return (action) =>
    explicit.has(action) || prefixes.some((prefix) => action.startsWith(prefix));
};

/** Finds a role by its unique `type` slug, or creates it. */
const ensureRole = async (strapi, { type, name, description }) => {
  const existing = await strapi.db.query('plugin::users-permissions.role').findOne({
    where: { type },
  });

  if (existing) {
    // Keep the human-readable fields in step with the matrix, so editing a
    // description here propagates instead of silently disagreeing with the
    // database. `type` is the identity and is never rewritten.
    if (existing.name !== name || existing.description !== description) {
      await strapi.db.query('plugin::users-permissions.role').update({
        where: { id: existing.id },
        data: { name, description },
      });
    }
    return { role: existing, created: false };
  }

  const role = await strapi.db.query('plugin::users-permissions.role').create({
    data: { type, name, description },
  });

  return { role, created: true };
};

/**
 * Brings one role's permissions in line with the matrix, and reports what moved.
 */
const syncRolePermissions = async (strapi, role, desiredActions, isManaged) => {
  const current = await strapi.db.query('plugin::users-permissions.permission').findMany({
    where: { role: role.id },
  });

  const currentActions = new Set(current.map((permission) => permission.action));
  const desired = new Set(desiredActions);

  const toGrant = [...desired].filter((action) => !currentActions.has(action));

  // Only revoke inside the boundary described above. A row that is not ours -
  // Strapi's auth defaults, most importantly - is left exactly as it is.
  const toRevoke = current.filter(
    (permission) => isManaged(permission.action) && !desired.has(permission.action)
  );

  for (const action of toGrant) {
    await strapi.db.query('plugin::users-permissions.permission').create({
      data: { action, role: role.id },
    });
  }

  for (const permission of toRevoke) {
    // Delete by primary key, not by action. The action column is not unique -
    // there is one row per (role, action) pair - so deleting by action alone
    // would strip that permission from every other role at the same time.
    await strapi.db.query('plugin::users-permissions.permission').delete({
      where: { id: permission.id },
    });
  }

  return { granted: toGrant.length, revoked: toRevoke.length };
};

/**
 * Points self-registration at the Student role.
 *
 * Strapi hands every newly registered user whichever role is named in its
 * `advanced.default_role` setting, which ships as 'authenticated'. Left alone,
 * anyone signing up would land in the unused fallback role and find themselves
 * locked out of an application they had just successfully joined.
 *
 * Setting it here rather than in the sign-up form matters: it holds even for a
 * request sent straight to Strapi's own /api/auth/local/register, bypassing this
 * project's frontend entirely. The rule belongs to the backend.
 */
const setDefaultRole = async (strapi) => {
  const pluginStore = strapi.store({ type: 'plugin', name: 'users-permissions' });
  const advanced = await pluginStore.get({ key: 'advanced' });

  if (!advanced || advanced.default_role === DEFAULT_ROLE_TYPE) {
    return false;
  }

  await pluginStore.set({
    key: 'advanced',
    value: { ...advanced, default_role: DEFAULT_ROLE_TYPE },
  });

  return true;
};

module.exports = async (strapi) => {
  const isManaged = buildManagedActionTest();

  let createdRoles = 0;
  let granted = 0;
  let revoked = 0;

  for (const definition of ROLES) {
    const { role, created } = await ensureRole(strapi, definition);
    if (created) {
      createdRoles += 1;
      strapi.log.info(`[seed] created role "${definition.name}" (${definition.type})`);
    }

    const counts = await syncRolePermissions(strapi, role, definition.permissions, isManaged);
    granted += counts.granted;
    revoked += counts.revoked;

    if (counts.granted || counts.revoked) {
      strapi.log.info(
        `[seed] ${definition.type}: +${counts.granted} permission(s), -${counts.revoked}`
      );
    }
  }

  if (await setDefaultRole(strapi)) {
    strapi.log.info(`[seed] self-registration now assigns the "${DEFAULT_ROLE_TYPE}" role`);
  }

  if (!createdRoles && !granted && !revoked) {
    strapi.log.info('[seed] roles and permissions already match the matrix');
  }

  return { createdRoles, granted, revoked };
};
