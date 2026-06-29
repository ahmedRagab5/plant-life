const mongoose = require('mongoose');

const imageSchema = new mongoose.Schema(
  {
    url: { type: String, required: true },
    publicId: { type: String, required: true },
    filename: { type: String, required: true },
  },
  { _id: false }
);

const perImageDetailSchema = new mongoose.Schema(
  {
    filename: String,
    disease: String,
    confidence: Number,
    severity_percent: Number,
  },
  { _id: false }
);

const resultSchema = new mongoose.Schema(
  {
    tree_status: String,
    tree_status_ar: String,
    is_infected: Boolean,
    total_images: Number,
    diseased_images: Number,
    healthy_images: Number,
    infection_ratio: Number,
    main_disease: String,
    main_disease_count: Number,
    all_diseases_found: { type: mongoose.Schema.Types.Mixed, default: {} },
    avg_severity_all_images: Number,
    avg_severity_diseased_only: Number,
    per_image_details: [perImageDetailSchema],
  },
  { _id: false }
);

const scanSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    images: [imageSchema],
    result: {
      type: resultSchema,
      required: true,
    },
    linkedHealPlan: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'HealPlan',
      default: null,
    },
    parentScan: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Scan',
      default: null,
    },
    severityDelta: {
      type: Number,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for paginated history sorted by date
scanSchema.index({ user: 1, createdAt: -1 });

// Text index for searching by disease name and tree status
scanSchema.index({
  'result.main_disease': 'text',
  'result.tree_status': 'text',
  'result.tree_status_ar': 'text',
});

const Scan = mongoose.model('Scan', scanSchema);

module.exports = Scan;
