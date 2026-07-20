/**
 * event controller
 */

import { factories } from '@strapi/strapi';

const EVENT_UID = 'api::event.event';

// Return { registered, count } for the current user on this event.
async function attendeeSummary(strapi: any, documentId: string, userId: number) {
  const ev = await strapi.documents(EVENT_UID).findOne({
    documentId,
    status: 'published',
    populate: { attendees: { fields: ['id'] } },
  });
  const attendees: any[] = ev?.attendees ?? [];
  return { registered: attendees.some((a) => a.id === userId), count: attendees.length };
}

// Add `attendeeCount` and `isRegistered` (for the current user) to an event,
// without exposing the attendee list (populating users is role-restricted).
async function enrich(strapi: any, entry: any, userId?: number) {
  if (!entry?.documentId) return entry;
  const full = await strapi.documents(EVENT_UID).findOne({
    documentId: entry.documentId,
    status: entry.publishedAt ? 'published' : 'draft',
    populate: { attendees: { fields: ['id'] } },
  });
  const attendees: any[] = full?.attendees ?? [];
  entry.attendeeCount = attendees.length;
  entry.isRegistered = userId ? attendees.some((a) => a.id === userId) : false;
  return entry;
}

export default factories.createCoreController(EVENT_UID, ({ strapi }) => ({
  async find(ctx) {
    const res = await super.find(ctx);
    const userId = ctx.state.user?.id;
    if (Array.isArray(res.data)) {
      await Promise.all(res.data.map((e: any) => enrich(strapi, e, userId)));
    }
    return res;
  },

  async findOne(ctx) {
    const res = await super.findOne(ctx);
    if (res?.data) await enrich(strapi, res.data, ctx.state.user?.id);
    return res;
  },

  // POST /events/:id/register — the current authenticated user joins the event.
  async register(ctx) {
    const user = ctx.state.user;
    if (!user) return ctx.unauthorized('You must be logged in to register.');
    const { id } = ctx.params;

    const ev = await strapi.documents(EVENT_UID).findOne({
      documentId: id,
      status: 'published',
      populate: { attendees: { fields: ['id'] } },
    });
    if (!ev) return ctx.notFound('Event not found.');

    const attendees: any[] = ev.attendees ?? [];
    const already = attendees.some((a) => a.id === user.id);
    // Enforce the event's capacity (skip if already registered — that's a no-op).
    if (!already && ev.Capacity != null && attendees.length >= ev.Capacity) {
      return ctx.badRequest('This event is full — no spots left.');
    }

    await strapi.documents(EVENT_UID).update({
      documentId: id,
      status: 'published',
      data: { attendees: { connect: [user.id] } },
    });
    ctx.body = await attendeeSummary(strapi, id, user.id);
  },

  // POST /events/:id/unregister — the current user leaves the event.
  async unregister(ctx) {
    const user = ctx.state.user;
    if (!user) return ctx.unauthorized('You must be logged in.');
    const { id } = ctx.params;
    await strapi.documents(EVENT_UID).update({
      documentId: id,
      status: 'published',
      data: { attendees: { disconnect: [user.id] } },
    });
    ctx.body = await attendeeSummary(strapi, id, user.id);
  },
}));
