/**
 * Custom route: expose the news-article category enum.
 * Public (auth disabled) — it only returns static option values.
 */

export default {
  routes: [
    {
      method: 'GET',
      path: '/news-articles/categories',
      handler: 'news-article.categories',
      config: {
        auth: false,
      },
    },
  ],
};
