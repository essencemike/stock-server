import * as Koa from 'koa';
import * as md5 from 'md5';
import chalk from 'chalk';
import config from '../../config';
import User from '../../models/user';

export default async (ctx: Koa.Context, next: any) => {
  const username = config.admin.username;
  const password = md5(config.admin.password);
  const name = config.admin.name;

  let result = await User
    .find()
    .exec()
    .catch(() => ctx.throw(500, '服务器内部错误-查找admin错误！'));

  if (result.length === 0) {
    let user = new User({
      name,
      username,
      password,
    });

    await user.save().catch(() => ctx.throw(500, '服务器内部错误-存储admin错误！'));
    console.log(`${chalk.green('[app]')} ${chalk.cyan('初始化admin账号密码完成！')}`);
  }

  await next();
};
