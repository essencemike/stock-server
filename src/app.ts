import * as Koa from 'koa';
import * as http from 'http';
import * as bodyParser from 'koa-bodyparser';
import * as kcors from 'kcors';
// import * as compress from 'koa-compose';

import chalk from 'chalk';
import * as moment from 'moment';

import { Route } from './middlewares/router/Route';
import errorHandle from './middlewares/errorHandle';
import response from './middlewares/response';
// import initAdmin from './middlewares/initAdmin';
// import * as Database from './lib/db';

const app = new Koa();
const router = new Route(app);

export class Server {
  app: Koa;
  config: any;
  router: Route;
  server: http.Server;

  constructor(config: any) {
    this.app = app;
    this.server = http.createServer(this.app.callback());
    this.config = config;
    this.router = router;

    this.init();
  }

  init(): void {
    // 连接 mongodb
    // Database.init(this.config.mongo);

    this.app.use(bodyParser());
    // 跨域
    this.app.use(kcors());

    this.app.use(response);
    this.app.use(errorHandle);
    // this.app.use(initAdmin);

    // 开启 Gzip
    // this.app.use(compress({
    //   filter: (content_type: any) => /text/i.test(content_type),
    //   threshold: 2048,
    //   flush: require('zlib').Z_SYNC_FLUSH,
    // }));

    // 初始化所有的 routers
    this.router.registerRouters(`${__dirname}/controllers`, { secret: this.config.jwt.secret, key: this.config.jwt.key });
  }

  start(): void {
    this.server.listen(this.config.port, () => {
      console.log(
        `[${chalk.grey(moment().format('HH:mm:ss'))}] ${chalk.blue(
          'Mock Server is running on port:',
        )} ${chalk.cyan(`${this.config.port}`)}`,
      );
    });
  }
}
