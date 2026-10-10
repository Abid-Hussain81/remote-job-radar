import { Schema, model, models, Model } from 'mongoose';
import type { Job } from '@/types/job';

const JobSchema = new Schema<Job>(
  {
    id: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    source: {
      type: String,
      enum: ['remoteok', 'wwr', 'jobicy', 'himalayas'],
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    company: {
      type: String,
      required: true,
      trim: true,
    },
    url: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: '',
    },
    tags: {
      type: [String],
      default: [],
    },
    locationText: {
      type: String,
      default: '',
    },
    eligibleCountries: {
      type: [String],
      default: [],
    },
    seniority: {
      type: String,
      default: null,
    },
    employmentType: {
      type: String,
      default: null,
    },
    salaryMin: {
      type: Number,
      default: null,
    },
    salaryMax: {
      type: Number,
      default: null,
    },
    currency: {
      type: String,
      default: null,
    },
    postedAt: {
      type: Date,
      required: true,
    },
    expiresAt: {
      type: Date,
      default: null,
    },
    fetchedAt: {
      type: Date,
      default: () => new Date(),
    },
    status: {
      type: String,
      enum: ['new', 'applied', 'hidden'],
      default: 'new',
      required: true,
    },
    score: {
      type: Number,
      default: 0,
      required: true,
    },
    matchedKeywords: {
      type: [String],
      default: [],
    },
    scoreReasons: {
      type: [String],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for querying user feed ranked by score and recency
JobSchema.index({ status: 1, score: -1, postedAt: -1 });

export const JobModel: Model<Job> =
  (models.Job as Model<Job>) || model<Job>('Job', JobSchema);

export default JobModel;
