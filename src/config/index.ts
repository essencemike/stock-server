const config = {
  port: 8088,

  app: {
    routerBase: '/api',
  },

  mongo: {
    host: '127.0.0.1',
    database: 'blog',
    port: 27017,
    user: '',
    password: '',
  },

  admin: {
    username: 'admin',
    password: 'secret+3s',
    name: 'IMike',
  },

  jwt: {
    secret: 'IMike-blog-jwt',
    key: 'IMike',
    time: '3600s',
  },
};

export default config;
