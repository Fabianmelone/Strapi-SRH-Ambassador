// Read-access probes. We hit each collection's `find` endpoint; Strapi returns
// 403 when the current role has no read permission, which tells us to hide the
// page and its nav entry. This mirrors the exact permissions set in Strapi
// rather than duplicating them in the frontend.
export const SECTION_PROBES: Record<string, string> = {
  bookings:  '/bookings?pagination[pageSize]=1&status=published',
  events:    '/events?pagination[pageSize]=1&status=published',
  news:      '/news-articles?pagination[pageSize]=1',
  locations: '/locations?pagination[pageSize]=1&status=published',
  materials: '/materials?pagination[pageSize]=1&status=published',
}

// Collection endpoints, used to probe write permissions (update/delete). We
// send the request against a non-existent documentId: Strapi's permission
// policy runs before the controller, so a forbidden role gets 403 while an
// allowed role gets 404 (entry not found) — a completely non-destructive check.
export const SECTION_ENDPOINTS: Record<string, string> = {
  bookings:  'bookings',
  events:    'events',
  news:      'news-articles',
  locations: 'locations',
  materials: 'materials',
}

// A documentId that will never exist, used only for the write probes above.
export const PROBE_DOC_ID = 'zzprobezznonexistentzz00'

// Payloads for the create probe (POST). The permission policy runs before
// validation, so a forbidden role always gets 403. For an *allowed* role we
// must ensure nothing is actually created: every payload here is designed to
// fail validation (missing required field, or — for bookings, which has no
// required fields — a deliberately invalid enum value), yielding a harmless 400.
export const SECTION_CREATE_PROBE: Record<string, Record<string, unknown>> = {
  bookings:  { Booking_Status: 'zzinvalidprobezz' },
  events:    {},
  news:      {},
  locations: {},
  materials: {},
}

export interface SectionCaps {
  read: boolean
  create: boolean
  update: boolean
  delete: boolean
}

export type SectionAccess = Record<string, boolean>
export type Capabilities = Record<string, SectionCaps>

export function canCreate(caps: Capabilities, section: string): boolean {
  return caps[section]?.create ?? false
}

export function canEdit(caps: Capabilities, section: string): boolean {
  return caps[section]?.update ?? false
}

export function canDelete(caps: Capabilities, section: string): boolean {
  return caps[section]?.delete ?? false
}

// Whether the detail modal can be opened. If you can read the list you can open
// a row's detail, so this is driven by the live read-permission probe — which
// works for any role the user creates in Strapi, without hardcoding role names.
export function canView(caps: Capabilities, section: string): boolean {
  return caps[section]?.read ?? false
}

// Sections that are pure "management" pages: they should only appear in the nav
// for roles that can actually manage the content, not roles that merely have
// read access for another purpose (e.g. attaching materials to an event).
const MANAGEMENT_SECTIONS = new Set(['materials'])

// Whether a section's page + nav entry should be shown to the current role.
// Normally that's read access; for management sections it requires the ability
// to create/update/delete, so read-only-for-relations roles don't see the page.
export function canSeeSection(caps: Capabilities, section: string): boolean {
  const c = caps[section]
  if (!c) return false
  if (MANAGEMENT_SECTIONS.has(section)) {
    return c.create || c.update || c.delete
  }
  return c.read
}
