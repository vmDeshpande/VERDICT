import { Schema, model, models } from 'mongoose';

export const CASE_TYPES = ['Criminal', 'Civil'] as const;
export type CaseType = (typeof CASE_TYPES)[number];

const caseSchema = new Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    jurisdiction: {
      type: String,
      required: true,
      enum: ['India', 'United States'],
    },
    courtType: {
      type: String,
      trim: true,
    },
    caseType: {
      type: String,
      required: true,
      enum: CASE_TYPES,
    },
    isFictional: {
      type: Boolean,
      default: false,
    },
    creatorId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

caseSchema.index({ jurisdiction: 1 });
caseSchema.index({ caseType: 1 });
caseSchema.index({ creatorId: 1 });

export const Case = models.Case || model('Case', caseSchema);
export type CaseDocument = InstanceType<typeof Case>;
