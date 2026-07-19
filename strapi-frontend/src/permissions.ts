// Define which roles can open the detail modal for each section.
// Role names must match exactly what's set in Strapi → Settings → Roles.
// Add new roles here as you create them in Strapi.
const sectionPermissions: Record<string, string[]> = {
  bookings:  ['Authenticated', 'Ambassador', 'Admin'],
  events:    ['Authenticated', 'Ambassador', 'Admin'],
  news:      ['Authenticated', 'Ambassador', 'Admin'],
  locations: ['Authenticated', 'Ambassador', 'Admin'],
  materials: ['Authenticated', 'Ambassador', 'Admin'],
}

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

export type SectionAccess = Record<string, boolean>

export function canViewDetail(section: string, roleName: string | undefined): boolean {
  // Treat undefined as 'Authenticated' — role may still be loading, and all
  // logged-in users are at minimum Authenticated.
  const role = roleName ?? 'Authenticated'
  return sectionPermissions[section]?.includes(role) ?? false
}
