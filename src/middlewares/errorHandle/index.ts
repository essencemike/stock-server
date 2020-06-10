import * as tracer from 'tracer';
import * as fs from 'fs';
import { Context } from 'koa';

const logger = tracer.colorConsole({
  level: 'error',
  format: '{{timestamp}} <{{title}}> {{message}} (in {{file}}:{{line}})',
  dateformat: 'HH:MM:ss.L',
  transport: function(data: any) {
    fs.appendFile('./error.log', data.output + '\n', { encoding: 'utf8' }, (err) => {
      if (err) {
        throw err;
      }
    });
  },
});

export default async (ctx: Context, next: any) => {
  try {
    await next();
  } catch (error) {
    logger.error(error.stack);
    throw(error);
  }
};
