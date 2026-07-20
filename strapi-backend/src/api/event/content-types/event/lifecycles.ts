import { errors } from '@strapi/utils'

const { ApplicationError } = errors

// Pull a related entry's id (numeric) or documentId (string) out of the many
// shapes the write payload can use: 5, "abc", [5], { id: 5 }, { set: [...] },
// { connect: [...] }.
function relId(val: any): number | string | null {
  if (val == null) return null
  if (typeof val === 'number' || typeof val === 'string') return val
  if (Array.isArray(val)) return val.length ? relId(val[0]) : null
  if (val.id != null) return val.id
  if (val.documentId != null) return val.documentId
  if (val.set != null) return relId(val.set)
  if (val.connect != null) return relId(val.connect)
  return null
}

async function fetchOne(uid: string, idOrDoc: number | string | null, populate?: any) {
  if (idOrDoc == null) return null
  const where = typeof idOrDoc === 'number' ? { id: idOrDoc } : { documentId: idOrDoc }
  return strapi.db.query(uid).findOne({ where, populate })
}

async function validate(event: any) {
  const data = event.params?.data || {}

  // Load the existing row (for updates) so we can fall back to unchanged values.
  let existing: any = null
  if (event.params?.where) {
    existing = await strapi.db.query('api::event.event').findOne({
      where: event.params.where,
      populate: { location: true, booking: { populate: { duration: true } }, duration: true },
    })
  }

  // --- Capacity must not exceed the location's max_capacity ---
  const capacityChanged = data.Capacity !== undefined || data.location !== undefined
  if (capacityChanged) {
    const capacity = data.Capacity ?? existing?.Capacity
    const locationId = relId(data.location) ?? existing?.location?.id ?? null
    const location = locationId ? await fetchOne('api::location.location', locationId) : existing?.location
    const maxCap = location?.max_capacity
    if (capacity != null && maxCap != null && Number(capacity) > Number(maxCap)) {
      throw new ApplicationError(
        `Event capacity (${capacity}) exceeds the location's capacity (${maxCap}).`,
      )
    }
  }

  // --- Event time must stay within the booking's timeframe ---
  const timeChanged = data.duration !== undefined || data.booking !== undefined
  if (timeChanged) {
    const duration = await resolveDuration(data.duration, existing?.duration)
    const bookingId = relId(data.booking) ?? existing?.booking?.id ?? null
    const booking = bookingId
      ? await fetchOne('api::booking.booking', bookingId, { duration: true })
      : existing?.booking

    const evStart = duration?.start_datetime
    const evEnd = duration?.end_datetime
    const bkStart = booking?.duration?.start_datetime
    const bkEnd = booking?.duration?.end_datetime

    if (evStart && evEnd && new Date(evEnd) < new Date(evStart)) {
      throw new ApplicationError('Event end time must be after its start time.')
    }
    if (evStart && bkStart && new Date(evStart) < new Date(bkStart)) {
      throw new ApplicationError("The event can't start before the booking's start time.")
    }
    if (evEnd && bkEnd && new Date(evEnd) > new Date(bkEnd)) {
      throw new ApplicationError("The event can't end after the booking's end time.")
    }
  }
}

// At the DB layer the event's `duration` component may already be reduced to a
// reference ({ id }). Resolve the actual start/end values in every shape.
async function resolveDuration(durData: any, existingDur: any) {
  if (durData == null) return existingDur
  if (durData.start_datetime !== undefined || durData.end_datetime !== undefined) return durData
  if (durData.id != null) {
    return strapi.db.query('shared.duration').findOne({ where: { id: durData.id } })
  }
  return existingDur
}

export default {
  async beforeCreate(event: any) {
    await validate(event)
  },
  async beforeUpdate(event: any) {
    await validate(event)
  },
}
