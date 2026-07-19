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

// Auth
export const login = (identifier: string, password: string) =>
  api.post('/auth/local', { identifier, password })

// Locations
export const getLocations = () =>
  api.get('/locations?populate=address&filters[is_available][$eq]=true')

// Bookings
export const getBookings = () =>
  api.get('/bookings?populate=location&sort=Booking_Date_Time:desc')

export const createBooking = (data: {
  Booking_Date_Time: string
  location: number
  Booking_Status: string
}) => api.post('/bookings', { data })

// Events
export const getEvents = () =>
  api.get('/events?populate=location,materials&sort=createdAt:desc')

export const createEvent = (data: {
  Name: string
  Access: string
  Capacity: number
  Is_online: boolean
  Meeting_Link?: string
  Description?: string
  location: number
}) => api.post('/events', { data })

// News Articles
export const getNewsArticles = () =>
  api.get('/news-articles?populate=author,thumbnail&sort=uploaded_at:desc')

export const createNewsArticle = (data: {
  title: string
  category: string
  Content: unknown
  uploaded_at: string
}) => api.post('/news-articles', { data })

export const updateNewsArticle = (id: number, data: Partial<{
  title: string
  category: string
  Content: unknown
  uploaded_at: string
}>) => api.put(`/news-articles/${id}`, { data })

export const deleteNewsArticle = (id: number) =>
  api.delete(`/news-articles/${id}`)
