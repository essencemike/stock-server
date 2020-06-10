import * as mongoose from 'mongoose';

const Schema = mongoose.Schema;

export interface IUser extends mongoose.Document {
  name: string;
  username: string;
  password: string;
  createTime: Date;
}

const userSchema = new Schema({
  name: String,
  username: String,
  password: String,
  createTime: {
    type: Date,
    default: Date.now,
  },
});

export default mongoose.model<IUser>('user', userSchema);
