const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema(
  {
    day: { type: Number, required: true },
    title: { type: String, required: true },
    description: { type: String, required: true },
    completed: { type: Boolean, default: false },
    completedAt: { type: Date, default: null },
    scheduledDate: { type: Date, required: true },
    notifiedAt: { type: Date, default: null }, // Last time a reminder was sent
  },
  { _id: false }
);

const healPlanSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    scan: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Scan',
      required: true,
    },
    disease: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ['active', 'completed', 'cancelled'],
      default: 'active',
    },
    tasks: [taskSchema],
    startDate: {
      type: Date,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Index for cron job: quickly find active plans with pending tasks
healPlanSchema.index({ status: 1, 'tasks.scheduledDate': 1 });

// Virtual: progress percentage
healPlanSchema.virtual('progress').get(function () {
  if (!this.tasks || this.tasks.length === 0) return 0;
  const completed = this.tasks.filter((t) => t.completed).length;
  return Math.round((completed / this.tasks.length) * 100);
});

// Ensure virtuals are included in JSON
healPlanSchema.set('toJSON', { virtuals: true });
healPlanSchema.set('toObject', { virtuals: true });

const HealPlan = mongoose.model('HealPlan', healPlanSchema);

module.exports = HealPlan;
