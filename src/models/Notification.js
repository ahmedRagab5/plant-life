const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    healPlan: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'HealPlan',
      default: null,
    },
    scan: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Scan',
      default: null,
    },
    taskIndex: {
      type: Number,
      default: null,
    },
    type: {
      type: String,
      enum: [
        'task_reminder',
        'plan_completed',
        'severity_improved',
        'severity_worsened',
        'plant_healed',
      ],
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    read: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Index for fetching user notifications sorted by date
notificationSchema.index({ user: 1, createdAt: -1 });
notificationSchema.index({ user: 1, read: 1 });

const Notification = mongoose.model('Notification', notificationSchema);

module.exports = Notification;
