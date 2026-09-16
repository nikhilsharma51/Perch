import { prisma } from "./prisma";

export interface Slot {
  startTime: Date;
  endTime: Date;
}

/**
 * Get available 30-minute slots for a space on a given date
 *
 * Logic:
 * 1. Fetch the space's open-hours rule for that day of the week
 * 2. Generate all 30-minute slots within those hours
 * 3. Fetch all existing bookings for that space on that date with status NOT IN ['cancelled', 'no_show']
 * 4. Filter out any generated slot whose time range overlaps with an existing booking
 * 5. Return the remaining slots
 *
 * Overlap check: a slot [slotStart, slotEnd) is taken if any booking exists where
 * booking.startTime < slotEnd AND booking.endTime > slotStart
 */
export async function getAvailableSlots(
  spaceId: string,
  date: Date
): Promise<Slot[]> {
  // Get day of week (0 = Sunday, 6 = Saturday)
  const dayOfWeek = date.getUTCDay();

  const openHours = await prisma.spaceOpenHours.findUnique({
    where: {
      spaceId_dayOfWeek: {
        spaceId,
        dayOfWeek,
      },
    },
  });

  if (!openHours || openHours.isClosed) {
    return [];
  }

  const slots = generateSlots(date, openHours.startTime, openHours.endTime);

  if (slots.length === 0) {
    return [];
  }

 
  const bookings = await prisma.booking.findMany({
    where: {
      spaceId,
      startTime: {
        gte: startOfDay(date),
        lt: endOfDay(date),
      },
      status: {
        notIn: ["cancelled", "no_show"],
      },
    },
  });

  const availableSlots = slots.filter((slot) => {
    const hasOverlap = bookings.some((booking) => {
      // Standard interval overlap check: booking.startTime < slotEnd AND booking.endTime > slotStart
      return booking.startTime < slot.endTime && booking.endTime > slot.startTime;
    });

    return !hasOverlap;
  });

  return availableSlots;
}

/**
 * Generate all 30-minute slots within a time range on a given date
 */
function generateSlots(date: Date, startTimeStr: string, endTimeStr: string): Slot[] {
  const slots: Slot[] = [];

  const [startHour, startMinute] = startTimeStr.split(":").map(Number);
  const [endHour, endMinute] = endTimeStr.split(":").map(Number);

  // Create start and end times for the day
  const dayStart = new Date(date);
  dayStart.setUTCHours(startHour, startMinute, 0, 0);

  const dayEnd = new Date(date);
  dayEnd.setUTCHours(endHour, endMinute, 0, 0);

  // Generate 30-minute slots
  let currentSlotStart = new Date(dayStart);
  while (currentSlotStart < dayEnd) {
    const currentSlotEnd = new Date(currentSlotStart);
    currentSlotEnd.setUTCMinutes(currentSlotEnd.getUTCMinutes() + 30);

    // Only add if the entire slot fits within business hours
    if (currentSlotEnd <= dayEnd) {
      slots.push({
        startTime: new Date(currentSlotStart),
        endTime: new Date(currentSlotEnd),
      });
    }

    currentSlotStart = currentSlotEnd;
  }

  return slots;
}

/**
 * Get the start of a day (UTC)
 */
function startOfDay(date: Date): Date {
  const result = new Date(date);
  result.setUTCHours(0, 0, 0, 0);
  return result;
}

/**
 * Get the end of a day (UTC)
 */
function endOfDay(date: Date): Date {
  const result = new Date(date);
  result.setUTCHours(23, 59, 59, 999);
  return result;
}
