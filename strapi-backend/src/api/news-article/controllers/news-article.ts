/**
 * news-article controller
 */

import { factories } from '@strapi/strapi';

const UID = 'api::news-article.news-article';

export default factories.createCoreController(UID, ({ strapi }) => ({
  // GET /news-articles/categories — the current category enum from the schema,
  // so the frontend dropdown always matches the backend.
  async categories(ctx) {
    const attr: any = strapi.contentType(UID).attributes.category;
    ctx.body = { categories: attr?.enum ?? [] };
  },
}));
