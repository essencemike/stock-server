import axios from 'axios';

import { Get, required, Controller, log, Post } from '../middlewares/router';

import { getPagesAsync as Crawl } from '../lib/utils';

const parse = require('csv-parse/lib/sync');
const iconv = require('iconv-lite');
const cheerio = require('cheerio');

function getCodePrefix(code: string): number {
  return code.startsWith('6') ? 0 : 1;
}

// 处理股票基本信息
function transformInfo(data: any[]) {
  return {
    name: data[1],
    price: data[3],
    zsz: data[45],
    code: data[2],
  };
}

// 参数是 历史市值， 历史股价
function transformLshqb(data: any[], Gdsj: any) {
  // 历史行情表 二维数组， 数组中分别代表 '年度， 市值， 复权价， 涨幅'
  // 计算时间跨度， 首先获取最后一条数据的年份， 以及第二条数据的年份
  // 开始时间
  const temp = data.slice(1);
  const len = temp.length - 1;
  const year0 = Year(temp[len][0]);
  const year1 = Year(temp[0][0]);
  const Yy = year1 - year0 + 1;

  const close1 = Gdsj.closes[0];
  const Temp = Gdsj.times;
  const Temp1 = Gdsj.closes;
  const xx = Temp.length - 1;

  const lshqb: any[] = [];

  for (let y = 1; y <= Yy; y++) {
    lshqb[y - 1] = [];
    for (let x = 1; x <= len; x++) {
      lshqb[y - 1][0] = year0 + y - 1;
      if ((lshqb[y - 1][0] - Year(temp[len - x + 1][0])) === 0) {
        if (x === len) {
          lshqb[y - 1][0] = temp[len - x + 1][0];
        }
        // 转换成亿元
        lshqb[y - 1][1] = (temp[len - x + 1][3]) / 100000000;
      }
    }
  }

  lshqb[Yy] = [];

  for (let y = 1; y <= Yy; y++) {
    for (let x = 0; x <= xx; x++) {
      if ((Year(lshqb[y - 1][0]) - Year(Temp[x])) === 0) {
        lshqb[y - 1][2] = Temp1[x];
        if (y === 1) {
          lshqb[y - 1][3] = lshqb[y - 1][2] / close1 - 1;
        } else {
          if (lshqb[y - 2][2] === 0) {
            lshqb[y - 2][2] = close1;
          }
          lshqb[y - 1][3] = lshqb[y - 1][2] / lshqb[y - 2][2] - 1;
        }
      }
    }
    lshqb[y][2] = lshqb[y - 1][2];
    lshqb[y][3] = 0;
  }
  lshqb[Yy] = [];
  lshqb[Yy][0] = '上市累计';
  lshqb[Yy][2] = close1;
  lshqb[Yy][3] = Temp1[xx] / close1 - 1;

  return lshqb;
}

// 财务数据： 资产负债表， 利润表， 现金流量表
function tranformCwsj(zcfzb: any[] = [], lrb: any[] = [], xjllb: any[] = []) {
  let Temp1 = zcfzb[0].length - 1;
  let temp = 1;

  for (let x = 2; x <= Temp1; x++) {
    if (Month(zcfzb[0][x - 1]) === 12 && Year(zcfzb[0][x - 1]) > 1970) {
      temp += 1;
    }
  }

  const nbH = temp;
  let A_nb;
  let xx;
  if (Month(zcfzb[0][1]) === 12) {
    A_nb = new Array(nbH);
    xx = A_nb.length;
  } else {
    A_nb = new Array(nbH + 1);
    A_nb[nbH] = [];
    A_nb[nbH][0] = zcfzb[0][1];
    xx = A_nb.length - 1;
  }

  for (let x = 2; x <= Temp1; x++) {
    if (Month(zcfzb[0][x - 1]) === 12) {
      if (!A_nb[xx - 1]) {
        A_nb[xx - 1] = [];
      }
      A_nb[xx - 1][0] = zcfzb[0][x - 1];
      xx = xx - 1;
    }

    if (xx === 1) {
      break;
    }
  }

  A_nb[0] = ['年度', '股东权益', '资产总计', '营业收入', '净利润', '经营现金净流量', '母公司股东权益'];

  // 处理资产负债表
  xx = A_nb.length;
  let Yy = Temp1;
  let zz = zcfzb.length - 1;

  for (let y = 2; y <= Yy; y++) {
    if (A_nb[xx - 1][0] === zcfzb[0][y - 1]) {
      for (let Z = 2; Z <= zz; Z++) {
        if (zcfzb[Z - 1][0] === '所有者权益(或股东权益)合计(万元)') {
          A_nb[xx - 1][1] = zcfzb[Z - 1][y - 1] / 10000;
        } else if (zcfzb[Z - 1][0] === '资产总计(万元)') {
          A_nb[xx - 1][2] = zcfzb[Z - 1][y - 1] / 10000;
        } else if (zcfzb[Z - 1][0] === '归属于母公司股东权益合计(万元)') {
          A_nb[xx - 1][6] = zcfzb[Z - 1][y - 1] / 10000;
        }
      }

      xx = xx - 1;
    }

    if (xx === 1) {
      break;
    }
  }

  // 处理利润表
  xx = A_nb.length;
  Yy = lrb[0].length - 1;
  zz = lrb.length - 1;

  for (let y = 2; y <= Yy; y++) {
    if (A_nb[xx - 1][0] === lrb[0][y - 1]) {
      for (let Z = 2; Z <= zz; Z++) {
        if (lrb[Z - 1][0] === '营业总收入(万元)') {
          if (!Number.isNaN(+(lrb[Z - 1][y - 1]))) {
            A_nb[xx - 1][3] = lrb[Z - 1][y - 1] / 10000;
          }
        } else if (lrb[Z - 1][0] === '净利润(万元)') {
          if (!Number.isNaN(+(lrb[Z - 1][y - 1]))) {
            A_nb[xx - 1][4] = lrb[Z - 1][y - 1] / 10000;
          }
        }
      }
      xx = xx - 1;
    }

    if (xx === 1) {
      break;
    }
  }

  // 处理现金流量表
  xx = A_nb.length;
  Yy = xjllb[0].length - 1;
  zz = xjllb.length - 1;

  for (let y = 2; y <= Yy; y++) {
    if (A_nb[xx - 1][0] === xjllb[0][y - 1]) {
      for (let Z = 2; Z <= zz; Z++) {
        if (xjllb[Z - 1][0] === '经营活动产生的现金流量净额(万元)') {
          A_nb[xx - 1][5] = xjllb[Z - 1][y - 1] / 10000;
        }
      }
      xx = xx - 1;
    }

    if (xx === 1) {
      break;
    }
  }

  // 处理年度
  xx = A_nb.length;
  for (let x = 2; x <= xx; x++) {
    if (Month(A_nb[x - 1][0]) === 12) {
      A_nb[x - 1][0] = Year(A_nb[x - 1][0]);
    } else {
      A_nb[x - 1][0] = `${Year(A_nb[x - 1][0])}0${Month(A_nb[x - 1][0])}`;
    }
  }

  return A_nb;
}

// 整理数据， 处理表头
function transformQjbsc(A_nb: any[]) {
  let nbH = A_nb.length;
  const A_qjbsc = [];
  A_qjbsc[0] = [
    '年度', '营业收入', '同比增长%', '净利润', '同比增长%', '经营现金净流量',
    '母公司股东权益', '资产负债率%', '销售净利率%', '摊薄ROE', '年度', '涨幅%', '期末市值', '历史PE'
  ];

  for (let x = 2; x <= nbH; x++) {
    A_qjbsc[x - 1] = [];
    A_qjbsc[x - 1][0] = A_nb[x - 1][0];
    if (A_nb[x - 1][3]) {
      A_qjbsc[x - 1][1] = A_nb[x - 1][3];
    }

    if (A_nb[x - 1][4]) {
      A_qjbsc[x - 1][3] = A_nb[x - 1][4];
    }
    if (A_nb[x - 1][5]) {
      A_qjbsc[x - 1][5] = A_nb[x - 1][5];
    }

    if (A_nb[x - 1][6]) {
      A_qjbsc[x - 1][6] = A_nb[x - 1][6];
    } else {
      if (A_nb[x - 1][1]) {
        A_qjbsc[0][6] = '股东权益合计';
        A_qjbsc[x - 1][6] = A_nb[x - 1][1];
      }
    }

    if (A_nb[x - 1][2] && A_nb[x - 1][1]) {
      A_qjbsc[x - 1][7] = ((1 - (A_nb[x - 1][1] / A_nb[x - 1][2])) * 100).toFixed(2);
    }

    if (A_nb[x - 1][3] && A_nb[x - 1][4]) {
      A_qjbsc[x - 1][8] = ((A_nb[x - 1][4] / A_nb[x - 1][3]) * 100).toFixed(2);
    }

    if (A_nb[x - 1][1] && A_nb[x - 1][4]) {
      const n = +(`${A_nb[x - 1][0]}12`.substring(4, 6)) / 3;
      A_qjbsc[x - 1][9] = (((A_nb[x - 1][4] / A_nb[x - 1][1]) * 4 / n) * 100).toFixed(2);
    }
  }

  const lastMonth = +`${A_nb[nbH - 1][0]}12`.substring(4, 6);
  if (lastMonth - 12 !== 0) {
    nbH = nbH - 1;
  }

  for (let x = 3; x <= nbH; x++) {
    if (A_qjbsc[x - 2][1]) {
      A_qjbsc[x - 1][2] = (((+A_qjbsc[x - 1][1] / +A_qjbsc[x - 2][1]) - 1) * 100).toFixed(2);
    }

    if (A_qjbsc[x - 2][3]) {
      if (+A_qjbsc[x - 1][3] > 0 && +A_qjbsc[x - 2][3] > 0) {
        A_qjbsc[x - 1][4] = ((+A_qjbsc[x - 1][3] / +A_qjbsc[x - 2][3] - 1) * 100).toFixed(2);
      } else {
        A_qjbsc[x - 1][4] = '-';
      }
    }
  }

  return A_qjbsc;
}

// 获取 每股收益，每股净资产，市净率， 市盈率动态， 市盈率静态
function tranformBasic($: any) {
  const span = $('table .tip.f12').map((i: number, el: any) => $(el).text()).get().map((s: string) => s.replace(/\n/g, '').trim());
  return {
    MGsy: span[1],
    MGjzc: span[11],
    xPB: span[7],
    dpe: span[0],
    jpe: span[3]
  };
}

// 获取公司信息
function tranformCompany($: any) {
  const span = $('table .hltip.fl').next().map((i: number, el: any) => $(el).text()).get().map((s: string) => s.replace(/\n/g, '').trim());
  return {
    GSdy: span[1],
    GShy: span[3],
    GSname: span[0],
    GSzy: span[6],
    Sssj: span[24]
  };
}

// 从同花顺赚取业绩
function tranformYjyc(A_qjbsc: any[], info: any, $: any) {
  const tr = $('.fr.yjyc table tbody tr');
  if (tr.length === 0) {
    return [];
  }
  const A_yjyc = [
    ['年度', '机构数', '最小', '平均', '最大', '增长率', 'PE', 'PEG']
  ];

  tr.each((i: number, el: any) => {
    A_yjyc[i + 1] = [$(el).find('th').text().trim()];
    $(el).find('td').each((j: number, e: any) => A_yjyc[i + 1].push($(e).text().trim()));
  });

  let nbH = A_qjbsc.length;

  for (let x = 2; x <= A_qjbsc.length; x++) {
    if (+A_yjyc[1][1] - +A_qjbsc[x - 1][0] === 1) {
      nbH = x;
      break;
    }
  }

  if (!Number.isNaN(+A_yjyc[1][3])) {
    A_yjyc[1][5] = ((+A_yjyc[1][3] / A_qjbsc[nbH - 1][3] - 1) * 100).toFixed(2);
    A_yjyc[1][6] = (+info.zsz / +A_yjyc[1][3]).toFixed(2);
    A_yjyc[1][7] = (+A_yjyc[1][6] / +A_yjyc[1][5]).toFixed(2);

    if (A_yjyc[1][5]) {
      A_yjyc[1][5] = `${A_yjyc[1][5]}%`;
    }
  }

  if (!Number.isNaN(+A_yjyc[2][3])) {
    A_yjyc[2][5] = ((+A_yjyc[2][3] / +A_yjyc[1][3] - 1) * 100).toFixed(2);
    A_yjyc[2][6] = (+info.zsz / +A_yjyc[2][3]).toFixed(2);
    A_yjyc[2][7] = (+A_yjyc[2][6] / +A_yjyc[2][5]).toFixed(2);

    if (A_yjyc[2][5]) {
      A_yjyc[2][5] = `${A_yjyc[2][5]}%`;
    }
  }

  if (!Number.isNaN(+A_yjyc[3][3])) {
    A_yjyc[3][5] = ((+A_yjyc[3][3] / +A_yjyc[2][3] - 1) * 100).toFixed(2);
    A_yjyc[3][6] = (+info.zsz / +A_yjyc[3][3]).toFixed(2);
    A_yjyc[3][7] = (+A_yjyc[3][6] / +A_yjyc[3][5]).toFixed(2);

    if (A_yjyc[3][5]) {
      A_yjyc[3][5] = `${A_yjyc[3][5]}%`;
    }
  }

  return A_yjyc;
}

// 计算现金利润比
function calcXjlr(A_qjbsc: any[]) {
  let xj = 0;
  let lr = 0;
  for (let i = 1; i < A_qjbsc.length; i++) {
    if (A_qjbsc[i][5]) {
      xj = xj + A_qjbsc[i][5];
      lr = lr + A_qjbsc[i][3];
    }
  }

  return ((xj / lr) * 100).toFixed(2);
}

// 计算营收复合增长率, 利润复合增长率
// index分别代表着他们的小标
function calcZzl(A_qjbsc: any[], index: number) {
  let xx = A_qjbsc.length - 1;
  let ret;

  if (Month(`${A_qjbsc[xx][0]}12`) - 12 !== 0) {
    xx = A_qjbsc.length - 2;
  }

  for (let i = 1; i <= xx - 1; i++) {
    if (+A_qjbsc[xx - i][index] > 0) {
      ret = ((Math.pow(+A_qjbsc[xx][index] / +A_qjbsc[xx - i][index], 1 / i) - 1) * 100).toFixed(2);
    }
  }

  return ret;
}

// 计算平均净利润，平均ROE，平均负债率
// index 分别表示净利润率 roe，负债率的下标
function calcAverage(A_qjbsc: any[], index: number) {
  let num = 0;

  for (let i = 1; i < A_qjbsc.length; i++) {
    num = num + +A_qjbsc[i][index];
  }

  return (num / (A_qjbsc.length - 1)).toFixed(2);
}

// 处理相应的格式转换成百分号
function addPrecent(A_qjbsc: any[]) {
  const len = A_qjbsc.length - 3;

  for (let i = 1; i < len; i++) {
    if (A_qjbsc[i][2]) {
      A_qjbsc[i][2] = `${A_qjbsc[i][2]}%`;
    }
    if (A_qjbsc[i][4]) {
      A_qjbsc[i][4] = `${A_qjbsc[i][4]}%`;
    }
    if (A_qjbsc[i][7]) {
      A_qjbsc[i][7] = `${A_qjbsc[i][7]}%`;
    }
    if (A_qjbsc[i][8]) {
      A_qjbsc[i][8] = `${A_qjbsc[i][8]}%`;
    }
    if (A_qjbsc[i][9]) {
      A_qjbsc[i][9] = `${A_qjbsc[i][9]}%`;
    }
    if (A_qjbsc[i][11]) {
      A_qjbsc[i][11] = `${A_qjbsc[i][11]}%`;
    }
  }

  const last = A_qjbsc.length - 1;
  const lastSecod = A_qjbsc.length - 2;
  const lastThree = A_qjbsc.length - 3;

  if (A_qjbsc[last][1]) {
    A_qjbsc[last][1] = `${A_qjbsc[last][1]}%`;
  }

  if (A_qjbsc[last][3]) {
    A_qjbsc[last][3] = `${A_qjbsc[last][3]}%`;
  }

  if (A_qjbsc[last][5]) {
    A_qjbsc[last][5] = `${A_qjbsc[last][5]}%`;
  }

  if (A_qjbsc[last][7]) {
    A_qjbsc[last][7] = `${A_qjbsc[last][7]}%`;
  }

  if (A_qjbsc[last][9]) {
    A_qjbsc[last][9] = `${A_qjbsc[last][9]}%`;
  }

  if (A_qjbsc[lastSecod][7]) {
    A_qjbsc[lastSecod][7] = `${A_qjbsc[lastSecod][7]}%`;
  }

  if (A_qjbsc[lastThree][11]) {
    A_qjbsc[lastThree][11] = `${A_qjbsc[lastThree][11]}%`;
  }

  return A_qjbsc;
}

// 最后整理成想要的格式 综合股票的信息 stock
function transformStock(A_qjbsc: any[], lshqb: any[], info: any, basic: any): any[] {
  // 计算年度 涨幅、期末市值、历史PE
  for (let i = 1; i < A_qjbsc.length; i++) {
    const year0 = Year(A_qjbsc[i][0]);
    let updated = false;
    for (let j = 0; j < lshqb.length - 1; j++) {
      const year1 = Year(lshqb[j][0]);

      // 判断年份相等
      if (+year0 - +year1 === 0) {
        updated = true;
        A_qjbsc[i][10] = lshqb[j][0];
        A_qjbsc[i][11] = (+lshqb[j][3] * 100).toFixed(2);
        A_qjbsc[i][12] = (+lshqb[j][1]).toFixed(2);

        if (+A_qjbsc[i][3] > 0) {
          A_qjbsc[i][13] = (+A_qjbsc[i][12] / +A_qjbsc[i][3]).toFixed(2);
        } else {
          A_qjbsc[i][13] = '';
        }
      }
    }

    if (!updated) {
      A_qjbsc[i][10] = '';
      A_qjbsc[i][11] = '';
      A_qjbsc[i][12] = '';
      A_qjbsc[i][13] = '';
    }
  }

  // 添加表尾信息
  const footer = [
    [
      '总股本',
      info.price && (+info.zsz / +info.price).toFixed(2),
      '每股收益',
      basic.MGsy,
      '每股净资产',
      basic.MGjzc,
      '当前价格',
      `${info.price} 元`,
      '研发占营收比',
      '',
      '上市累计',
      (+lshqb[lshqb.length - 1][3] * 100).toFixed(2),
      '',
      ''
    ],
    [
      'PE(动态/静态)',
      `${basic.dpe}/${basic.jpe}`,
      'PB',
      basic.xPB,
      '市值',
      info.zsz,
      '现金利润比',
      calcXjlr(A_qjbsc),
      '分红率平均',
      '',
      '',
      '',
      '',
      ''
    ],
    [
      '营收复合增长率',
      calcZzl(A_qjbsc, 1),
      '利润复合增长率',
      calcZzl(A_qjbsc, 3),
      '平均净利润率',
      calcAverage(A_qjbsc, 8),
      '平均ROE',
      calcAverage(A_qjbsc, 9),
      '平均负债率',
      calcAverage(A_qjbsc, 7),
      '',
      '',
      '',
      ''
    ],
  ];

  return addPrecent([...A_qjbsc, ...footer]);
}

// 获取基本信息
function getStockInfo(code: string): Promise<any> {
  const prefix = code.startsWith('6') ? 'sh' : 'sz';
  const url = `http://qt.gtimg.cn/q=${prefix}${code}`;
  return new Promise((resolve, reject) => {
    Crawl(url).then((res: Buffer[]) => {
      const udata = iconv.decode(Buffer.concat(res), 'GB2312');
      const data = udata.split('~');
      resolve(data);
    }).catch(reject);
  });
}

// 获取历史股价
async function getHistoryGj(code: string): Promise<any> {
  const prefix = getCodePrefix(code);
  const url = `http://img1.money.126.net/data/hs/klinederc/day/times/${prefix}${code}.json`;
  return new Promise((resolve, reject) => {
    axios(url).then(res => {
      resolve(res.data);
    }).catch(reject);
  });
}

async function getHistoryZsz(code: string): Promise<any> {
  const prefix = getCodePrefix(code);
  const url = `http://quotes.money.163.com/service/chddata.html?code=${prefix}${code}&start=19800101&end=20990101&fields=TCAP`;
  return new Promise((resolve, reject) => {
    Crawl(url).then((res: Buffer[]) => {
      const udata = iconv.decode(Buffer.concat(res), 'GB2312');
      const data = parse(udata, {
        trim: true,
        on_record: (record: any[]) =>
          [record[0], record[1].replace(`'`, ''), record[2], record[3]],
      });
      resolve(data);
    }).catch(reject);
  });
}

// 获取资产负债表
async function getZcfzb(code: string): Promise<any> {
  const url = `http://quotes.money.163.com/service/zcfzb_${code}.html`;
  return new Promise((resolve, reject) => {
    Crawl(url).then((res: Buffer[]) => {
      const udata = iconv.decode(Buffer.concat(res), 'GB2312');
      const data = parse(udata, {
        trim: true,
      });
      resolve(data);
    }).catch(reject);
  });
}

// 获取利润表
async function getLrb(code: string): Promise<any> {
  const url = `http://quotes.money.163.com/service/lrb_${code}.html`;
  return new Promise((resolve, reject) => {
    Crawl(url).then((res: Buffer[]) => {
      const udata = iconv.decode(Buffer.concat(res), 'GB2312');
      const data = parse(udata, {
        trim: true,
      });
      resolve(data);
    }).catch(reject);
  });
}

// 获取现金流量表
async function getXjllb(code: string): Promise<any> {
  const url = `http://quotes.money.163.com/service/xjllb_${code}.html`;
  return new Promise((resolve, reject) => {
    Crawl(url).then((res: Buffer[]) => {
      const udata = iconv.decode(Buffer.concat(res), 'GB2312');
      const data = parse(udata, {
        trim: true,
        skip_lines_with_error: true
      });
      resolve(data);
    }).catch(reject);
  });
}

// 从同花顺抓取F10资料
async function getBasicInfo(url: string): Promise<any> {
  return new Promise((resolve, reject) => {
    axios(url, { responseType : 'stream' }).then((res) => {
      let chunks: Buffer[] = [];
      res.data.on('data', (chunk: any) => chunks.push(chunk));
      res.data.on('end', () => {
        const html = iconv.decode(Buffer.concat(chunks), 'gbk');
        const $ = cheerio.load(html, { decodeEntities: false });
        resolve($);
      });
    }).catch(reject);
  });
}

function Year(time: string | number, sep: string = '-') {
  if (typeof time === 'number') return time;
  const times = time.split(sep);

  if (times.length > 1) {
    return +times[0];
  }

  return +(time.substring(0, 4));
}

function Month(time: string): number {
  return +time.split('-')[1];
}

@Controller('stock')
export default class StockController {
  @Get(':code')
  @required({ params: 'code' })
  @log
  async getStock(ctx: any) {
    const code = ctx.params.code;

    const [stockInfo, zsz, lsgj, zcfz, lrb, xjllb, basicHtml, companyHtml, yjycHtml] = await Promise.all([
      getStockInfo(code),
      getHistoryZsz(code),
      getHistoryGj(code),
      getZcfzb(code),
      getLrb(code),
      getXjllb(code),
      getBasicInfo(`http://basic.10jqka.com.cn/16/${code}/`),
      getBasicInfo(`http://basic.10jqka.com.cn/32/${code}/company.html`),
      getBasicInfo(`http://basic.10jqka.com.cn/${code}/worth.html`)
    ]);

    const lshqb = transformLshqb(zsz, lsgj);
    const info = transformInfo(stockInfo);
    const A_nb = tranformCwsj(zcfz, lrb, xjllb);
    const qjbsc = transformQjbsc(A_nb);
    const basic = tranformBasic(basicHtml);
    const company = tranformCompany(companyHtml);
    const yjyc = tranformYjyc(qjbsc, info, yjycHtml);
    const stock = transformStock(qjbsc, lshqb, info, basic);

    const data = {
      company,
      info,
      yjyc,
      stock,
    };

    ctx.success({
      msg: '查询成功！',
      data,
    });
  }

  @Post(':code')
  @log
  async getStockMarketData(ctx: any) {
    const code = ctx.params.code;
    const prefix = code.startsWith('6') ? 'SH' : 'SZ';
    const { start_date, end_date, period } = ctx.request.body;
    const data = await axios.post('http://api.tushare.pro', {
      api_name: period,
      token: '7c986053dc9823f692f7f74f38e13ae81645a8c991d479125aad9eea',
      params: {
        ts_code: `${code}.${prefix}`,
        start_date,
        end_date,
      },
      fields: 'trade_date,open,high,low,close,vol',
    }).then((res: any) => res.data.data);

    ctx.success({
      msg: '查询成功',
      data,
    });
  }
}
