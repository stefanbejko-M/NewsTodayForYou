/**
 * Publishing Schedule Helper
 * 
 * This module handles the scheduling of posts for publication.
 * It decouples "fetch time" (when articles are pulled from source) 
 * from "publish time" (when articles appear on the site).
 * 
 * IMPORTANT: This does NOT change how often we call external APIs.
 * It only controls when posts are marked as published in our database.
 */

/**
 * Weekly template of publishing slots (UTC)
 * Each day has multiple slots spread throughout the day
 */
const WEEKLY_PUBLISHING_SLOTS: Record<number, string[]> = {
  0: ['09:30', '13:30', '17:30', '21:30'], // Sunday
  1: ['06:00', '10:00', '14:00', '18:00', '22:00'], // Monday
  2: ['07:00', '11:00', '15:00', '19:00', '23:00'], // Tuesday
  3: ['06:30', '10:30', '14:30', '18:30', '22:30'], // Wednesday
  4: ['07:30', '11:30', '15:30', '19:30', '23:30'], // Thursday
  5: ['06:15', '10:15', '14:15', '18:15', '22:15'], // Friday
  6: ['09:00', '13:00', '17:00', '21:00'], // Saturday
}

/**
 * Get the maximum number of posts that can be published per day
 * This is configurable via environment variable
 */
export function getMaxPostsPerDay(): number {
  const envValue = process.env.MAX_PUBLISHED_POSTS_PER_DAY
  if (envValue) {
    const parsed = parseInt(envValue, 10)
    if (!isNaN(parsed) && parsed > 0) {
      return parsed
    }
  }
  // Default: 80 posts per day
  return 80
}

/**
 * Calculate the next available publishing slot
 * 
 * @param currentTime - Current UTC time (defaults to now)
 * @param existingScheduledCount - Number of posts already scheduled for today
 * @returns ISO timestamp string for the next available slot, or null if daily cap reached
 */
export function calculateNextPublishSlot(
  currentTime: Date = new Date(),
  existingScheduledCount: number = 0
): string | null {
  const maxPerDay = getMaxPostsPerDay()
  
  // If we've already scheduled the max for today, schedule for tomorrow
  if (existingScheduledCount >= maxPerDay) {
    const tomorrow = new Date(currentTime)
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1)
    tomorrow.setUTCHours(0, 0, 0, 0)
    const dayOfWeek = tomorrow.getUTCDay()
    const slots = WEEKLY_PUBLISHING_SLOTS[dayOfWeek] || WEEKLY_PUBLISHING_SLOTS[1] // Fallback to Monday
    if (slots.length > 0) {
      const [hours, minutes] = slots[0].split(':').map(Number)
      tomorrow.setUTCHours(hours, minutes, 0, 0)
      return tomorrow.toISOString()
    }
    return null
  }

  const dayOfWeek = currentTime.getUTCDay()
  const slots = WEEKLY_PUBLISHING_SLOTS[dayOfWeek] || WEEKLY_PUBLISHING_SLOTS[1] // Fallback to Monday
  
  if (slots.length === 0) {
    // No slots for this day, schedule for tomorrow's first slot
    const tomorrow = new Date(currentTime)
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1)
    tomorrow.setUTCHours(0, 0, 0, 0)
    const tomorrowDayOfWeek = tomorrow.getUTCDay()
    const tomorrowSlots = WEEKLY_PUBLISHING_SLOTS[tomorrowDayOfWeek] || WEEKLY_PUBLISHING_SLOTS[1]
    if (tomorrowSlots.length > 0) {
      const [hours, minutes] = tomorrowSlots[0].split(':').map(Number)
      tomorrow.setUTCHours(hours, minutes, 0, 0)
      return tomorrow.toISOString()
    }
    return null
  }

  // Find the next available slot today
  const currentHour = currentTime.getUTCHours()
  const currentMinute = currentTime.getUTCMinutes()
  const currentTimeMinutes = currentHour * 60 + currentMinute

  for (const slot of slots) {
    const [hours, minutes] = slot.split(':').map(Number)
    const slotMinutes = hours * 60 + minutes
    
    // If this slot is in the future, use it
    if (slotMinutes > currentTimeMinutes) {
      const scheduledTime = new Date(currentTime)
      scheduledTime.setUTCHours(hours, minutes, 0, 0)
      scheduledTime.setUTCSeconds(0, 0)
      return scheduledTime.toISOString()
    }
  }

  // All slots for today have passed, use first slot tomorrow
  const tomorrow = new Date(currentTime)
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1)
  tomorrow.setUTCHours(0, 0, 0, 0)
  const tomorrowDayOfWeek = tomorrow.getUTCDay()
  const tomorrowSlots = WEEKLY_PUBLISHING_SLOTS[tomorrowDayOfWeek] || WEEKLY_PUBLISHING_SLOTS[1]
  if (tomorrowSlots.length > 0) {
    const [hours, minutes] = tomorrowSlots[0].split(':').map(Number)
    tomorrow.setUTCHours(hours, minutes, 0, 0)
    return tomorrow.toISOString()
  }

  // Fallback: schedule for 1 hour from now
  const fallback = new Date(currentTime)
  fallback.setUTCHours(fallback.getUTCHours() + 1)
  return fallback.toISOString()
}

/**
 * Get count of posts already scheduled for today (UTC)
 * This is a helper that can be used to check before scheduling
 */
export async function getTodayScheduledCount(
  supabaseClient: any,
  currentTime: Date = new Date()
): Promise<number> {
  const startOfDay = new Date(currentTime)
  startOfDay.setUTCHours(0, 0, 0, 0)
  const endOfDay = new Date(currentTime)
  endOfDay.setUTCHours(23, 59, 59, 999)

  const { count, error } = await supabaseClient
    .from('post')
    .select('*', { count: 'exact', head: true })
    .eq('is_published', false)
    .gte('scheduled_for', startOfDay.toISOString())
    .lte('scheduled_for', endOfDay.toISOString())

  if (error) {
    console.error('[SCHEDULE] Error counting scheduled posts:', error)
    return 0
  }

  return count || 0
}

