import * as mongoose from 'mongoose';

const Schema = mongoose.Schema;

const tagSchema = new Schema({
  name: {
    type: String,
    default: '',
  },
});

export default mongoose.model('tag', tagSchema);
