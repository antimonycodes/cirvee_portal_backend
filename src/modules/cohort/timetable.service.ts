import prisma from "@config/database";
import logger from "../../utils/logger";

export class TimetableService {
  // Get current week boundaries based on cohort dates
  static getCurrentWeekBoundaries(cohortStartDate: Date) {
    const now = new Date();
    const cohortStart = new Date(cohortStartDate);
    
    // Calculate weeks elapsed since cohort start
    const msPerWeek = 7 * 24 * 60 * 60 * 1000;
    const weeksSinceStart = Math.floor((now.getTime() - cohortStart.getTime()) / msPerWeek);
    
    // Get Monday of current week relative to cohort
    const currentWeekStart = new Date(cohortStart);
    currentWeekStart.setDate(cohortStart.getDate() + (weeksSinceStart * 7));
    
    const currentWeekEnd = new Date(currentWeekStart);
    currentWeekEnd.setDate(currentWeekStart.getDate() + 6);
    
    return { currentWeekStart, currentWeekEnd, weekNumber: weeksSinceStart + 1 };
  }

  // CREATE TIMETABLE 
  static async createTimetable(data: {
    cohortId: string;
    dayOfWeek: string;
    startTime: string;
    endTime: string;
  }) {
    // Validate day of week
    const validDays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
    if (!validDays.includes(data.dayOfWeek)) {
      throw new Error("Invalid day of week");
    }

    // Validate time format (HH:mm)
    const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
    if (!timeRegex.test(data.startTime) || !timeRegex.test(data.endTime)) {
      throw new Error("Invalid time format. Use HH:mm format (e.g., 09:00)");
    }

    // Validate that start time is before end time
    if (data.startTime >= data.endTime) {
      throw new Error("End time must be after start time");
    }

    // Verify cohort exists
    const cohort = await prisma.cohort.findUnique({
      where: { id: data.cohortId },
    });
    if (!cohort) {
      throw new Error("Cohort not found");
    }

    // Check for conflicts 
    const existingTimetables = await prisma.timetable.findMany({
      where: {
        cohortId: data.cohortId,
        dayOfWeek: data.dayOfWeek,
      },
    });

    for (const existing of existingTimetables) {
      if (
        (data.startTime >= existing.startTime && data.startTime < existing.endTime) ||
        (data.endTime > existing.startTime && data.endTime <= existing.endTime) ||
        (data.startTime <= existing.startTime && data.endTime >= existing.endTime)
      ) {
        throw new Error(`Time conflict with existing timetable on ${data.dayOfWeek}`);
      }
    }

    const timetable = await prisma.timetable.create({
      data: {
        cohortId: data.cohortId,
        dayOfWeek: data.dayOfWeek,
        startTime: data.startTime,
        endTime: data.endTime,
      },
      include: {
        cohort: {
          select: {
            name: true,
            startDate: true,
            endDate: true,
          },
        },
      },
    });

    logger.info(`Timetable created for cohort ${data.cohortId} on ${data.dayOfWeek}`);
    return timetable;
  }

  // UPDATE TIMETABLE
  static async updateTimetable(
    timetableId: string,
    data: {
      dayOfWeek?: string;
      startTime?: string;
      endTime?: string;
    }
  ) {
    const existing = await prisma.timetable.findUnique({
      where: { id: timetableId },
    });

    if (!existing) {
      throw new Error("Timetable entry not found");
    }

    // Validate if provided
    if (data.dayOfWeek) {
      const validDays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
      if (!validDays.includes(data.dayOfWeek)) {
        throw new Error("Invalid day of week");
      }
    }

    const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
    if (data.startTime && !timeRegex.test(data.startTime)) {
      throw new Error("Invalid start time format");
    }
    if (data.endTime && !timeRegex.test(data.endTime)) {
      throw new Error("Invalid end time format");
    }

    const finalStartTime = data.startTime || existing.startTime;
    const finalEndTime = data.endTime || existing.endTime;
    if (finalStartTime >= finalEndTime) {
      throw new Error("End time must be after start time");
    }

    // Check conflicts (excluding current entry)
    const finalDayOfWeek = data.dayOfWeek || existing.dayOfWeek;
    const conflicts = await prisma.timetable.findMany({
      where: {
        cohortId: existing.cohortId,
        dayOfWeek: finalDayOfWeek,
        id: { not: timetableId },
      },
    });

    for (const conflict of conflicts) {
      if (
        (finalStartTime >= conflict.startTime && finalStartTime < conflict.endTime) ||
        (finalEndTime > conflict.startTime && finalEndTime <= conflict.endTime) ||
        (finalStartTime <= conflict.startTime && finalEndTime >= conflict.endTime)
      ) {
        throw new Error(`Time conflict with existing timetable on ${finalDayOfWeek}`);
      }
    }

    const updated = await prisma.timetable.update({
      where: { id: timetableId },
      data: {
        dayOfWeek: data.dayOfWeek,
        startTime: data.startTime,
        endTime: data.endTime,
      },
      include: {
        cohort: {
          select: {
            name: true,
          },
        },
      },
    });

    logger.info(`Timetable ${timetableId} updated`);
    return updated;
  }

  // DELETE TIMETABLE
  static async deleteTimetable(timetableId: string) {
    const timetable = await prisma.timetable.findUnique({
      where: { id: timetableId },
    });

    if (!timetable) {
      throw new Error("Timetable entry not found");
    }

    await prisma.timetable.delete({
      where: { id: timetableId },
    });

    logger.info(`Timetable ${timetableId} deleted`);
    return { message: "Timetable deleted successfully" };
  }

  // GET WEEKLY TIMETABLE (Smart & Dynamic for Students/Tutors)
  static async getWeeklyTimetable(cohortId: string) {
    const cohort = await prisma.cohort.findUnique({
      where: { id: cohortId },
      select: {
        startDate: true,
        endDate: true,
        name: true,
        status: true,
      },
    });

    if (!cohort) {
      throw new Error("Cohort not found");
    }

    // Get current week boundaries
    const { currentWeekStart, currentWeekEnd, weekNumber } = 
      this.getCurrentWeekBoundaries(cohort.startDate);

    // Get all timetable entries for this cohort
    const timetableEntries = await prisma.timetable.findMany({
      where: { cohortId },
      orderBy: [
        { dayOfWeek: "asc" },
        { startTime: "asc" },
      ],
    });

    // Map days to dates for current week
    const dayMapping = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const weekSchedule = timetableEntries.map((entry) => {
      const dayIndex = dayMapping.indexOf(entry.dayOfWeek);
      const actualDate = new Date(currentWeekStart);
      actualDate.setDate(currentWeekStart.getDate() + dayIndex);

      return {
        ...entry,
        actualDate: actualDate.toISOString().split("T")[0], // YYYY-MM-DD
        isPast: actualDate < new Date(),
        isToday: actualDate.toDateString() === new Date().toDateString(),
      };
    });

    return {
      cohort: {
        id: cohortId,
        name: cohort.name,
        status: cohort.status,
        startDate: cohort.startDate,
        endDate: cohort.endDate,
      },
      weekInfo: {
        weekNumber,
        startDate: currentWeekStart.toISOString().split("T")[0],
        endDate: currentWeekEnd.toISOString().split("T")[0],
      },
      schedule: weekSchedule,
    };
  }

  // GET ALL TIMETABLES FOR A COHORT (Admin view)
  static async getAllTimetablesForCohort(cohortId: string) {
    const cohort = await prisma.cohort.findUnique({
      where: { id: cohortId },
      select: {
        name: true,
        startDate: true,
        endDate: true,
      },
    });

    if (!cohort) {
      throw new Error("Cohort not found");
    }

    const timetables = await prisma.timetable.findMany({
      where: { cohortId },
      orderBy: [
        { dayOfWeek: "asc" },
        { startTime: "asc" },
      ],
    });

    return {
      cohort,
      timetables,
      totalEntries: timetables.length,
    };
  }
}