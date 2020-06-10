import * as Koa from 'koa';
import chalk from 'chalk';
import { RouteConfig, RouteBaseConfig } from '../../types/router';
import { requireDescriptor, sureIsArray, decorate } from '../../lib';
import { RequestMethod } from '../../types/enums/request-method.enum';

import { symbolRoutePrefix, Route } from './Route';

let requestID = 0;

/**
 * url参数
 * list/:id?username=zhangsan&&age=30
 * @required({query: 'username'})
 * @required({query: ['username','age'],params: 'id'})
 */
export function required(args: any) {
  return (target: any, name: string, descriptor: PropertyDescriptor) => {
    return requireDescriptor(target, name, descriptor, args);
  };
}

/**
 * 添加静态属性
 * @Controller('user')
 */
export function Controller(prefix: string = '/' ) {
  return (target: any) => {
    target.prototype[symbolRoutePrefix] = prefix;
  };
}

/**
 * 路由
 * @Router({
 *   method: 'get',
 *   path: '/login/:id'
 * })
 */
export function Router(path: string = '', config: RouteConfig) {
  return (target: any, name: string) => {
    Route.__DecoratedRouters.set({
      target,
      path,
      method: config.method,
      unless: config.unless,
    }, target[name]);
  };
}

const createMappingDecorator = (method: RequestMethod) => (
  path?: string,
  config?: RouteBaseConfig,
) => {
  const mergeConfig: RouteConfig = { ...config, method };
  return Router(path, mergeConfig);
};

// Routes HTTP GET requests to the specified path
export const Get = createMappingDecorator(RequestMethod.GET);

// Routes HTTP POST requests to the specified path
export const Post = createMappingDecorator(RequestMethod.POST);

// Routes HTTP PUT requests to the specified path
export const Put = createMappingDecorator(RequestMethod.PUT);

// Routes HTTP DELETE requests to the specified path
export const Delete = createMappingDecorator(RequestMethod.DELETE);

// Routes HTTP PATCH requests to the specified path
export const Patch = createMappingDecorator(RequestMethod.PATCH);

/**
 * 修饰方法
 * @params
 * @convert(async function(ctx, next){await next()})
 */
export function convert(middleware: Function) {
  return decorate((target: any, name: string, descriptor: PropertyDescriptor, middleware: Function) => {
    target[name] = sureIsArray(target[name]);
    target[name].splice(target[name].length - 1, 0, middleware);
    return descriptor;
  }, sureIsArray(middleware));
}

/**
 * 日志 修饰api方法
 * use: @log
 * @export
 * @param {*} target
 * @param {string} name
 * @param {PropertyDescriptor} value
 * @returns
 */
export function log(target: any, name: string, value: PropertyDescriptor) {
  async function Logger(ctx: Koa.Context, next: any) {
    // 请求数加1
    const currentRequestID = requestID++;

    const startTime = process.hrtime();

    if ((ctx.method).toLowerCase() === 'post') {
      console.log(`${chalk.green('→')} (ID: ${currentRequestID}) ${chalk.blue(`${ctx.method}`)} ${JSON.stringify(ctx.request.body)}`);
    } else {
      console.log(`${chalk.green('→')} (ID: ${currentRequestID}) ${chalk.blue(`${ctx.method}`)} ${ctx.url}`);
    }

    await next();

    const endTime = process.hrtime();
    const timespan = (endTime[0] - startTime[0]) * 1000 + (endTime[1] - startTime[1]) / 1000000;
    console.log(`${chalk.green('←')} (ID: ${currentRequestID}) ${chalk.blue(`${ctx.method}`)} ${ctx.url}, Status: ${ctx.status} Time: ${timespan.toFixed(0)} ms`);
  }

  target[name] = sureIsArray(target[name]);
  target[name].splice(target[name].length - 1, 0, Logger);

  return value;
}
