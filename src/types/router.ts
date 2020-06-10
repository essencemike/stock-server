import { RequestMethod } from './enums/request-method.enum';

export interface RouteBaseConfig {
  unless?: boolean;
}

export interface RouteConfig extends RouteBaseConfig {
  method: RequestMethod;
}

export interface RouteMap extends RouteConfig {
  target: any;
  path: string;
}
