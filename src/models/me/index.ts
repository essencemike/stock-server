import * as mongoose from 'mongoose';

const Schema = mongoose.Schema;

const meSchema = new Schema({
  content: {
    type: String,
    default: '',
  },
});

export default mongoose.model('me', meSchema);
