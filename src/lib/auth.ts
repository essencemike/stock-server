import * as Koa from 'koa';
import * as jwt from 'jsonwebtoken';
import config from '../config';

/**
 * 生成 token
 *
 * @export
 * @param {string} userId
 * @returns token
 */
export function signToken(userId: string) {
  const jwtConfig = config.jwt;
  const token = jwt.sign({ userId }, jwtConfig.secret, { expiresIn: jwtConfig.time });

  return token;
}

export async function verifyToken(ctx: Koa.Context, decodedToken: object, token: string) {
  console.log(decodedToken, token);
  const authorization = ctx.get('authorization');
  if (authorization) {
    let token = authorization.split(' ')[1];
    try {
      jwt.verify(token, config.jwt.secret);
      return Promise.resolve(false);
    } catch (err) {
      ctx.throw(401, 'expired token');
      return Promise.resolve(true);
    }
  } else {
    ctx.throw(401, 'no token detected in http header Authorization');
    return Promise.resolve(true);
  }
}
