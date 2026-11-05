import { Schema, model, models } from 'mongoose';

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
      enum: ['PLAINTIFF', 'DEFENDANT', 'PROSECUTION', 'DEFENSE'],
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
courtroomMemberSchema.index({ courtroomId: 1 });

export const CourtroomMember = models.CourtroomMember || model('CourtroomMember', courtroomMemberSchema);
export type CourtroomMemberDocument = InstanceType<typeof CourtroomMember>;
