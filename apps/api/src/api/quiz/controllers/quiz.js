'use strict';

/**
 * quiz controller.
 *
 * createCoreController gives us the default find / findOne / create / update /
 * delete handlers. Where this project needs different behaviour - scoping reads
 * to the current user, stripping the quiz answer key, deriving ownership from
 * the token instead of the request body - we override the specific method here
 * rather than replacing the whole controller.
 */

const { createCoreController } = require('@strapi/strapi').factories;

module.exports = createCoreController('api::quiz.quiz');
