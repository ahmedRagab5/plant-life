const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema(
  {
    day: { type: Number, required: true },
    dayTitle: { type: String, default: '' },       // title of the day group (e.g. "اكتشاف الإصابة")
    title: { type: String, required: true },
    description: { type: String, required: true },
    why: { type: String, default: '' },            // rationale for the task
    tips: { type: [String], default: [] },         // optional best-practice tips
    warnings: { type: [String], default: [] },     // cautions / warnings
    estimatedTime: { type: String, default: '' },  // e.g. "20 دقيقة"
    completed: { type: Boolean, default: false },
    completedAt: { type: Date, default: null },
    scheduledDate: { type: Date, required: true },
    notifiedAt: { type: Date, default: null },     // last time a reminder was sent
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
    // Rich metadata from the new healPlans.json schema
    scientificName: { type: String, default: '' },
    severity: { type: String, default: '' },
    spreadSpeed: { type: String, default: '' },
    isCurable: { type: Boolean, default: true },
    successRate: { type: String, default: '' },
    recoverTime: { type: String, default: '' },
    cause: { type: String, default: '' },
    symptoms: { type: [String], default: [] },
    prevention: { type: [String], default: [] },
    recommendedProducts: { type: mongoose.Schema.Types.Mixed, default: [] },
    whenToHarvest: { type: String, default: '' },
    emergency: { type: Boolean, default: false },
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