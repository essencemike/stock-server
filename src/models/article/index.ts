import * as mongoose from 'mongoose';
import * as moment from 'moment';

const Schema = mongoose.Schema;
moment.locale('zh-cn');

const articleSchema = new Schema({
  title: String,
  content: String,
  abstract: String,
  publish: {
    type: Boolean,
    default: false,
  },
  createTime: {
    type: Date,
    default: Date.now,
  },
  lastEditTime: {
    type: Date,
    default: Date.now,
  },
  tags: [{ type: Schema.Types.ObjectId, ref: 'tag' }],
});

// 必须先set后get
articleSchema.set('toJSON', { getters: true, virtuals: true });
articleSchema.set('toObject', { getters: true, virtuals: true });

articleSchema.path('createTime').get((v: any) => moment(v).format('YYYY-MM-DD HH:mm:ss'));
articleSchema.path('lastEditTime').get((v: any) => moment(v).format('YYYY-MM-DD HH:mm:ss'));

export default mongoose.model('article', articleSchema);
