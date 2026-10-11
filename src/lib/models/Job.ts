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
      enum: [
        'remoteok',
        'wwr',
        'jobicy',
        'himalayas',
        'greenhouse',
        'lever',
        'ashby',
      ],
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
    isWorldwide: {
      type: Boolean,
      default: null,
    },
    eligibleCountries: {
      type: [String],
      default: [],
    },
    isRemote: {
      type: Boolean,
      required: true,
      default: true,
    },
    trust: {
      type: String,
      enum: ['direct', 'aggregator'],
      required: true,
      default: 'aggregator',
    },
    companyBoard: {
      type: {
        platform: {
          type: String,
          enum: ['greenhouse', 'lever', 'ashby'],
          required: true,
        },
        token: {
          type: String,
          required: true,
        },
      },
      default: null,
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
