/**
 * Custom event routes: self-service register / unregister.
 * These are subject to the Users & Permissions role permissions
 * (actions "register" and "unregister" under Event).
 */

export default {
  routes: [
    {
      method: 'POST',
      path: '/events/:id/register',
      handler: 'event.register',
    },
    {
      method: 'POST',
      path: '/events/:id/unregister',
      handler: 'event.unregister',
    },
  ],
};
