const http = require('http');
const hh = require('http-https');

export function sleep(duration: number) {
  return new Promise(resolve => {
    setTimeout(resolve, duration);
  });
}

export function getPagesAsync(url: string) {
  return new Promise(function (resolve, reject) {
    http
      .get(url, function (res: any) {
        const chunks: any[] = [];

        res.on('data', function(chunk: any) {
          chunks.push(chunk);
        });

        res.on('end', function() {
          resolve(chunks);
        });
      })
      .on('error', function (e: any) {
        reject(e);
        console.log('获取信息出错！');
      });
  });
}

export function getHttpsPages(url: string) {
  return new Promise(function (resolve, reject) {
    hh.request(url, function (res: any) {
      const chunks: any[] = [];

      res.on('data', function(chunk: any) {
        chunks.push(chunk);
      });

      res.on('end', function() {
        resolve(chunks);
      });
    }).on('error', function (e: any) {
      reject(e);
      console.log('获取信息出错！');
    });
  });
}
