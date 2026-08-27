'use strict';

const { createCoreService } = require('@strapi/strapi').factories;

module.exports = createCoreService('api::lesson-completion.lesson-completion');
