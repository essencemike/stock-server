import * as mongoose from 'mongoose';

export interface DbConfig {
  user: string;
  password: string;
  host: string;
  port: number;
  database: string;
}

export function init(config: DbConfig) {
  (<any>mongoose).Promise = global.Promise;
  const mongoUrl = `mongodb://${config.host}:${config.port}/${config.database}`;
  mongoose.connect(mongoUrl);

  const db = mongoose.connection;

  db.on('error', () => {
    console.log(`Unable to connect to database: ${config.host}: ${config.port}`);
  });

  db.once('open', () => {
    console.log(`Connected to database: ${config.host}: ${config.port}`);
  });
}
