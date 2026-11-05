import { Schema, model, models } from 'mongoose';

export const COURTROOM_MEMBER_ROLES = ['PLAINTIFF', 'DEFENDANT', 'PROSECUTION', 'DEFENSE'] as const;
export type CourtroomMemberRole = (typeof COURTROOM_MEMBER_ROLES)[number];

const courtroomMemberSchema = new Schema(
  {
    courtroomId: {
      type: Schema.Types.ObjectId,
      ref: 'Courtroom',
      required: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    role: {
      type: String,
      required: true,
      enum: COURTROOM_MEMBER_ROLES,
    },
    joinedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: false,
  }
);

courtroomMemberSchema.index({ courtroomId: 1, userId: 1 }, { unique: true });
courtroomMemberSchema.index({ courtroomId: 1, role: 1 }, { unique: true });
courtroomMemberSchema.index({ courtroomId: 1 });

export const CourtroomMember = models.CourtroomMember || model('CourtroomMember', courtroomMemberSchema);
export type CourtroomMemberDocument = InstanceType<typeof CourtroomMember>;
