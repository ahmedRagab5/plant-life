const cron = require('node-cron');
const HealPlan = require('../models/HealPlan');
const notificationService = require('../services/notification.service');

/**
 * Start the heal plan reminder cron job.
 * Runs every minute — checks for active heal plans with overdue tasks
 * and sends reminder notifications to users.
 *
 * @param {import('socket.io').Server} io - Socket.IO instance
 */
const startHealPlanReminder = (io) => {
  // Run every minute
  cron.schedule('* * * * *', async () => {
    try {
      const now = new Date();

      // Find all active heal plans with at least one overdue, incomplete task
      const activePlans = await HealPlan.find({
        status: 'active',
        tasks: {
          $elemMatch: {
            completed: false,
            scheduledDate: { $lte: now },
          },
        },
      });

      for (const plan of activePlans) {
        for (let i = 0; i < plan.tasks.length; i++) {
          const task = plan.tasks[i];

          // Skip completed tasks
          if (task.completed) continue;

          // Skip tasks not yet due
          if (task.scheduledDate > now) continue;

          // Only notify once per day per task to avoid spam
          if (task.notifiedAt) {
            const hoursSinceNotified = (now - task.notifiedAt) / (1000 * 60 * 60);
            if (hoursSinceNotified < 24) continue;
          }

          // Send reminder notification
          await notificationService.createNotification(
            {
              user: plan.user,
              healPlan: plan._id,
              taskIndex: i,
              type: 'task_reminder',
              title: '⏰ تذكير بمهمة العلاج',
              message: `حان وقت مهمة "${task.title}" من خطة علاج ${plan.disease}. ${task.description}`,
            },
            io
          );

          // Update notifiedAt to prevent duplicate notifications
          plan.tasks[i].notifiedAt = now;
        }

        // Save updated notification timestamps
        await plan.save();
      }
    } catch (error) {
      console.error('❌ Heal plan reminder cron error:', error.message);
    }
  });

  console.log('⏰ Heal plan reminder cron job started (runs every minute)');
};

module.exports = startHealPlanReminder;
