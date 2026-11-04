import { Schema, model } from "mongoose";

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
      enum: ["India", "United States"],
    },
    courtType: {
      type: String,
      trim: true,
    },
    caseType: {
      type: String,
      required: true,
      enum: ["Criminal", "Civil"],
    },
    isFictional: {
      type: Boolean,
      default: false,
    },
    creatorId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    plaintiffId: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    defendantId: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
  }
);

caseSchema.index({ jurisdiction: 1 });
caseSchema.index({ caseType: 1 });
caseSchema.index({ creatorId: 1 });

export const Case = model("Case", caseSchema);
export type CaseDocument = InstanceType<typeof Case>;