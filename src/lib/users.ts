import { Schema, model, models } from "mongoose";

const userSchema = new Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    name: {
      type: String,
      trim: true,
    },
    image: {
      type: String,
    },
    passwordHash: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

export const User = models.User || model("User", userSchema);
export type UserDocument = InstanceType<typeof User>;