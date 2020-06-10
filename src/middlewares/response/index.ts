import { Response } from '../../types/response';

export default async (ctx: any, next: any) => {
  ctx.success = ({ data, msg }: Response) => {
    ctx.body = {
      code: 200,
      data,
      msg,
      success: true,
    };
  };

  await next();
};
