import axios from 'axios'

const BASE_URL = import.meta.env.VITE_STRAPI_URL || 'http://localhost:1337'

export const api = axios.create({
  baseURL: `${BASE_URL}/api`,
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

export const strapiMediaUrl = (url: string) =>
  url?.startsWith('http') ? url : `${BASE_URL}${url}`

// Media upload — posts to Strapi's upload plugin and returns the new file id.
export const uploadMedia = async (file: File): Promise<number> => {
  const fd = new FormData()
  fd.append('files', file)
  const res = await api.post('/upload', fd)
  return res.data[0].id
}

// Auth
export const login = (identifier: string, password: string) =>
  api.post('/auth/local', { identifier, password })

// Locations (for booking form — available only)
export const getLocations = () =>
  api.get('/locations?populate[0]=address&filters[is_available][$eq]=true&status=published')

// Bookings
export interface DurationInput {
  start_datetime?: string | null
  end_datetime?: string | null
}

export const getBookings = () =>
  api.get('/bookings?populate[location]=true&populate[duration]=true&sort=Booking_Date_Time:desc&status=published')

export const createBooking = (data: {
  Booking_Date_Time: string
  location: number
  Booking_Status: string
  duration?: DurationInput
}) => api.post('/bookings?status=published', { data })

export const updateBooking = (id: string, data: Partial<{
  Booking_Date_Time: string
  location: number
  Booking_Status: string
  duration: DurationInput
}>) => api.put(`/bookings/${id}?status=published`, { data })

export const deleteBooking = (id: string) =>
  api.delete(`/bookings/${id}`)

// Events
export const getEvents = () =>
  api.get('/events?populate[location]=true&populate[materials]=true&populate[Thumbnail]=true&populate[duration]=true&populate[booking][populate][0]=location&populate[booking][populate][1]=duration&sort=createdAt:desc&status=published')

export const createEvent = (data: {
  Name: string
  Access: string
  Capacity: number
  Is_online: boolean
  Meeting_Link?: string
  Description?: string
  location: number
  booking: number
  materials?: number[]
  Thumbnail?: number
  duration?: DurationInput
}) => api.post('/events?status=published', { data })

export const updateEvent = (id: string, data: Partial<{
  Name: string
  Access: string
  Capacity: number
  Is_online: boolean
  Meeting_Link?: string
  Description?: string
  location: number
  booking: number
  materials: number[]
  Thumbnail: number
  duration: DurationInput
}>) => api.put(`/events/${id}?status=published`, { data })

export const deleteEvent = (id: string) =>
  api.delete(`/events/${id}`)

// Self-service attendance — the current user joins/leaves the event.
// Returns { registered, count }.
export const registerForEvent = (id: string) =>
  api.post(`/events/${id}/register`)

export const unregisterFromEvent = (id: string) =>
  api.post(`/events/${id}/unregister`)

// News Articles
export const getNewsArticles = () =>
  api.get('/news-articles?populate=*&sort=createdAt:desc')

// The category enum, straight from the backend schema (keeps the UI in sync).
export const getNewsCategories = () =>
  api.get('/news-articles/categories')

export const createNewsArticle = (data: {
  title: string
  category: string
  Content: unknown
  uploaded_at: string
  thumbnail?: number
}) => api.post('/news-articles?status=published', { data })

export const updateNewsArticle = (id: string, data: Partial<{
  title: string
  category: string
  Content: unknown
  uploaded_at: string
  thumbnail: number
}>) => api.put(`/news-articles/${id}?status=published`, { data })

export const deleteNewsArticle = (id: string) =>
  api.delete(`/news-articles/${id}`)

// Material Categories
export const getMaterialCategories = () =>
  api.get('/material-categories?sort=Name:asc&status=published')

export const createMaterialCategory = (data: { Name: string }) =>
  api.post('/material-categories?status=published', { data })

// Materials
export const getMaterials = () =>
  api.get('/materials?populate[0]=material_category&sort=Name:asc&status=published')

export const createMaterial = (data: {
  Name: string
  Capacity?: number
  material_category?: number
}) => api.post('/materials?status=published', { data })

export const updateMaterial = (id: string, data: Partial<{
  Name: string
  Capacity: number
  material_category: number
}>) => api.put(`/materials/${id}?status=published`, { data })

export const deleteMaterial = (id: string) =>
  api.delete(`/materials/${id}`)

// Addresses
export const getAddresses = () =>
  api.get('/addresses?populate[0]=locations&sort=City:asc&status=published')

export const createAddress = (data: {
  street_name: string
  building_number: number
  postal_code: number
  City: string
  Country: string
}) => api.post('/addresses?status=published', { data })

export const updateAddress = (id: string, data: Partial<{
  street_name: string
  building_number: number
  postal_code: number
  City: string
  Country: string
}>) => api.put(`/addresses/${id}?status=published`, { data })

// Locations (full CRUD)
export const getAllLocations = () =>
  api.get('/locations?populate[0]=address&populate[1]=location_image&sort=Name:asc&status=published')

export const createLocation = (data: {
  Name: string
  type: string
  min_capacity?: number
  max_capacity?: number
  is_available: boolean
  location_image?: number[]
}) => api.post('/locations?status=published', { data })

export const updateLocation = (id: string, data: Partial<{
  Name: string
  type: string
  min_capacity: number
  max_capacity: number
  is_available: boolean
  address: number
  location_image: number[]
}>) => api.put(`/locations/${id}?status=published`, { data })

export const deleteLocation = (id: string) =>
  api.delete(`/locations/${id}`)
