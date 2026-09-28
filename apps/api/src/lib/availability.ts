import { prisma } from "./prisma";

export interface Slot {
  startTime: Date;
  endTime: Date;
}

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

function generateSlots(date: Date, startTimeStr: string, endTimeStr: string): Slot[] {
  const slots: Slot[] = [];

  const [startHour, startMinute] = startTimeStr.split(":").map(Number);
  const [endHour, endMinute] = endTimeStr.split(":").map(Number);

  const dayStart = new Date(date);
  dayStart.setUTCHours(startHour, startMinute, 0, 0);

  const dayEnd = new Date(date);
  dayEnd.setUTCHours(endHour, endMinute, 0, 0);


  let currentSlotStart = new Date(dayStart);
  while (currentSlotStart < dayEnd) {
    const currentSlotEnd = new Date(currentSlotStart);
    currentSlotEnd.setUTCMinutes(currentSlotEnd.getUTCMinutes() + 30);

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


function startOfDay(date: Date): Date {
  const result = new Date(date);
  result.setUTCHours(0, 0, 0, 0);
  return result;
}


function endOfDay(date: Date): Date {
  const result = new Date(date);
  result.setUTCHours(23, 59, 59, 999);
  return result;
}
