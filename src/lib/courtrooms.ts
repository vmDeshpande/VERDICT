import { Schema, model, models } from 'mongoose';

const courtroomSchema = new Schema(
  {
    caseId: {
      type: Schema.Types.ObjectId,
      ref: 'Case',
    },
    title: {
      type: String,
      trim: true,
    },
    jurisdiction: {
      type: String,
      enum: ['India', 'United States'],
    },
    courtType: {
      type: String,
      trim: true,
    },
    caseType: {
      type: String,
      enum: ['Criminal', 'Civil'],
    },
    status: {
      type: String,
      enum: ['CREATED', 'WAITING', 'ACTIVE', 'COMPLETED', 'ARCHIVED'],
      default: 'CREATED',
    },
    templateKey: {
      type: String,
      trim: true,
    },
    invitationCode: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
    },
    invitationExpiresAt: {
      type: Date,
      required: true,
    },
    maxParticipants: {
      type: Number,
      default: 2,
    },
    hostUserId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

courtroomSchema.index({ status: 1 });
courtroomSchema.index({ jurisdiction: 1 });
courtroomSchema.index({ hostUserId: 1 });

export const Courtroom = models.Courtroom || model('Courtroom', courtroomSchema);
export type CourtroomDocument = InstanceType<typeof Courtroom>;
