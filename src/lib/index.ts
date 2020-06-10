import * as Koa from 'koa';

export function sureIsArray(arr: any) {
  return Array.isArray(arr) ? arr : [arr];
}

export function isDescriptor(desc: PropertyDescriptor | Function): boolean {
  if (!desc || !desc.hasOwnProperty) return false;

  for (let key of ['value', 'initializer', 'get', 'set']) {
    if (desc.hasOwnProperty(key)) return true;
  }

  return false;
}

export function last(arr: Array<Function>): Function | PropertyDescriptor {
  return arr[arr.length - 1];
}

/**
 * URL必传参数校验
 * @required({params: 'username'})
 * @required({params: ['username','age']})
 * @required({query: 'username'})
 */
export function requireDescriptor(target: any, name: string, descriptor: PropertyDescriptor, rules: any) {
  async function middleware(ctx: Koa.Context, next: any) {
    if (rules.query) {
      rules.query = sureIsArray(rules.query);

      for (let name of rules.query) {
        if (!ctx.query[name]) {
          ctx.throw(412, `GET Request query: ${name} required`);
        }
      }
    }

    if (rules.params) {
      rules.params = sureIsArray(rules.params);

      for (let name of rules.params) {
        if (!ctx.params[name]) {
          ctx.throw(412, `GET Request params: ${name} required`);
        }
      }
    }

    await next();
  }

  target[name] = sureIsArray(target[name]);
  target[name].splice(target[name].length - 1, 0, middleware);

  return descriptor;
}

export function decorate(handleDescriptor: Function, entryArgs: Array<Function>) {
  if (isDescriptor(last(entryArgs))) return handleDescriptor(entryArgs);

  return function () {
    return handleDescriptor(...Array.from(arguments), ...entryArgs);
  };
}
