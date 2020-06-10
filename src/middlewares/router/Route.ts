import * as Koa from 'koa';
import * as Router from 'koa-router';
import * as glob from 'glob';
import * as path from 'path';
import * as jwt from 'koa-jwt';
import { RouteMap } from '../../types/router';
// import { verifyToken } from '../../lib/auth';
import config from '../../config';

const router = new Router({
  prefix: config.app.routerBase,
});

export const symbolRoutePrefix: symbol = Symbol('routePrefix');

/**
 * 路由执行类
 * 入口文件载入
 * const route = new Route(ctx: Koa);
 *
 * @class Route
 */
export class Route {
  // 静态属性，存储被修饰后的路由的地方
  static __DecoratedRouters: Map<RouteMap, Function | Function[]> = new Map();
  private router: any;
  private app: Koa;

  /**
   * Create an instance of Route
   *
   * @param {Koa} app
   * @memberOf Route
   */
  constructor(app: Koa) {
    this.app = app;
    this.router = router;
  }

  /**
   * 注册路由
   * new Route(ctx:Koa).registerRouters(apipath);
   *
   * @param {String} controllerDir api文件路径
   *
   * @memberOf Route
   */
  registerRouters(controllerDir: string, jwtOpts: jwt.Options) {
    // 载入api接口，使用sync同步载入
    glob.sync(path.join(controllerDir, './**/*')).forEach(item => require(item));

    let unlessPath: string[] = [];
    Route.__DecoratedRouters.forEach((controller, config) => {
      let controllers = Array.isArray(controller) ? controller : [controller];
      let prefixPath = config.target[symbolRoutePrefix];
      let path = config.path;

      if (prefixPath && (!prefixPath.startsWith('/'))) {
        prefixPath = `/${prefixPath}`;
      }

      if (path && !path.startsWith('/')) {
        path = `/${path}`;
      }

      let routerPath = prefixPath + path;
      if (config.unless) {
        unlessPath.push(routerPath);
      }

      controllers.forEach((controller) => this.router[config.method](routerPath, controller));
    });

    // 暂时所有有允许通过
    // this.app.use(jwt({ secret: jwtOpts.secret, key: jwtOpts.key, isRevoked: verifyToken, debug: true, passthrough: true }).unless({ path: unlessPath }));
    this.app.use(this.router.routes());
    this.app.use(this.router.allowedMethods());
  }
}
