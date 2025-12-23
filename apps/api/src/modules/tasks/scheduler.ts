import { logger } from '../../utils/logger.js';
import * as taskRepo from './repository.js';
import * as pushService from '../push/service.js';

let isRunning = false;
let intervalId: NodeJS.Timeout | null = null;

/**
 * Check for tasks that need reminder notifications
 * and send them
 */
async function checkReminders(): Promise<void> {
    if (isRunning) {
        logger.debug('Reminder check already running, skipping');
        return;
    }

    isRunning = true;

    try {
        const tasks = await taskRepo.findTasksNeedingReminder();

        if (tasks.length > 0) {
            logger.info(`Found ${tasks.length} tasks needing reminders`);
        }

        for (const task of tasks) {
            if (!task.assigned_to) {
                // No one assigned, skip and mark as sent
                await taskRepo.markReminderSent(task.id);
                continue;
            }

            try {
                await pushService.notifyTaskReminder(
                    task.assigned_to,
                    task.title,
                    task.reminder_minutes || 0
                );

                await taskRepo.markReminderSent(task.id);

                logger.info('Sent task reminder', {
                    taskId: task.id,
                    userId: task.assigned_to,
                    title: task.title,
                });
            } catch (error) {
                logger.error('Failed to send task reminder', {
                    taskId: task.id,
                    error,
                });
            }
        }
    } catch (error) {
        logger.error('Error checking reminders', { error });
    } finally {
        isRunning = false;
    }
}

/**
 * Start the reminder scheduler
 * Checks every minute for tasks that need reminders
 */
export function startScheduler(): void {
    if (intervalId) {
        logger.warn('Scheduler already running');
        return;
    }

    logger.info('Starting task reminder scheduler');

    // Run immediately on startup
    checkReminders();

    // Then run every minute
    intervalId = setInterval(checkReminders, 60 * 1000);
}

/**
 * Stop the reminder scheduler
 */
export function stopScheduler(): void {
    if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
        logger.info('Stopped task reminder scheduler');
    }
}
