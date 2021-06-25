'use strict';

const dayjs = require('dayjs');
const winston = require('winston');

const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    transports: [
        new winston.transports.Console({
            format: winston.format.simple(),
        }),
    ],
    exitOnError: false,
});

const db = require('./db');

const ALL_SYMBOLS = require('./symbols.json');
const DATE_FORMAT = 'YYYY-MM-DD';

let cash = 1000000;
const MIN_BUY = 1000;
const MAX_BUY = 7000;
const TRANSACTION_FEE = 7.0;
const TAX_RATE = 0.25;
let depot = [];
ALL_SYMBOLS.forEach(symbol => { depot[symbol] = { amount: 0, avgSharePrice: 0.0, profit: 0.0 }; });
let transactionFees = 0;
let taxes = 0;

// Has symbol closed below sma50 previously?
let closedBelowSma50 = [];

const FMT = new Intl.NumberFormat('de-DE', { maximumFractionDigits: 2 });

const filter = (symbol, date) => {
    return {
        symbol: { eq: symbol },
        date: { between: [date.subtract(4, 'day').format(DATE_FORMAT), date.format(DATE_FORMAT)] },
    };
};

async function getDailyAdjustedFor(symbol, date) {
    const dailyAdjusted = (await db.handleThroughput(filter => db.DailyAdjusted.query(filter).exec(),
        filter(symbol, date))).toJSON();
    return dailyAdjusted.slice(-1)[0];
}

async function getTechnicalIndicatorsFor(symbol, date) {
    const tis = (await db.handleThroughput(filter => db.TechnicalIndicators.query(filter).exec(),
        filter(symbol, date))).toJSON();
    if (tis.length < 2) {
        return { tiBefore: undefined, tiCurrent: undefined };
    }
    const tiBefore = tis.slice(-2, -1)[0];
    const tiCurrent = tis.slice(-1)[0];
    return { tiBefore, tiCurrent };
}

async function calcDepot(date) {
    const values = Object.keys(depot).map(async symbol => {
        const amount = depot[symbol].amount;
        return amount === 0 ? 0 : amount * (await getDailyAdjustedFor(symbol, date)).adjustedClose;
    });
    return (await Promise.all(values)).reduce((sum, value) => sum + value);
}

async function buy(date, symbol, dailyAdjusted) {
    const sharePrice = dailyAdjusted.adjustedClose;
    // performs better with rebuying
    /*
    if (depot[symbol].amount > 0 && sharePrice >= depot[symbol].avgSharePrice) {
        console.log('not re-buying ' + symbol + ' at higher price');
        return false;
    }
    */
    if (cash >= MIN_BUY && cash >= sharePrice + TRANSACTION_FEE) {
        const amount = Math.floor(Math.min(MAX_BUY, cash - TRANSACTION_FEE) / sharePrice);
        cash -= (amount * sharePrice) + TRANSACTION_FEE;
        if (depot[symbol].amount > 0) {
            const newAmount = depot[symbol].amount + amount;
            const newAvgSharePrice = (depot[symbol].amount * depot[symbol].avgSharePrice + amount * sharePrice) / newAmount;
            depot[symbol].amount = newAmount;
            depot[symbol].avgSharePrice = newAvgSharePrice;
        } else {
            depot[symbol].amount = amount;
            depot[symbol].avgSharePrice = sharePrice;
        }
        transactionFees += TRANSACTION_FEE;
        logger.info('bought ' + amount + ' of ' + symbol + ' on ' + date.format(DATE_FORMAT) + ' for ' + FMT.format(sharePrice)
            + ', now have ' + depot[symbol].amount + ' with avg share price of ' + FMT.format(depot[symbol].avgSharePrice)
            + ', cash is now ' + FMT.format(cash));
        return true;
    } else {
        logger.info('cant buy ' + symbol + ' on ' + date.format(DATE_FORMAT) + ' for ' + FMT.format(sharePrice) + ', not enough $ :(');
    }
}

async function sell(date, symbol, dailyAdjusted) {
    if (depot[symbol].amount > 0) {
        const sellPrice = dailyAdjusted.adjustedClose;
        if (sellPrice > depot[symbol].avgSharePrice) {
            const profit = (depot[symbol].amount * sellPrice) - (depot[symbol].amount * depot[symbol].avgSharePrice);
            const tax = (profit > 0) ? profit * TAX_RATE : 0.0;
            // TODO get tax back when selling with loss
            cash += (depot[symbol].amount * sellPrice) - TRANSACTION_FEE - tax;
            transactionFees += TRANSACTION_FEE;
            taxes += tax;
            logger.info('sold ' + depot[symbol].amount + ' of ' + symbol + ' on ' + date.format(DATE_FORMAT) + ' for ' + FMT.format(sellPrice)
                + ', profit is ' + FMT.format(profit)
                + ', cash is now ' + FMT.format(cash));

            depot[symbol].amount = 0;
            depot[symbol].avgSharePrice = 0.0;
            depot[symbol].profit += profit;
            return true;
        } else {
            logger.info('not selling ' + symbol + ' at lower price');
        }
    }
}

function buyItMacd(tiBefore, tiCurrent) {
    if (tiBefore.macd && tiCurrent.macd) {
        if (tiBefore.macd < 0 && tiCurrent.macd > 0) {
            // TODO don't buy if RSI <50
            // TODO only if above SMA50/SMA200?
            return true;
        }
    }
}

function sellItMacd(tiBefore, tiCurrent) {
    if (tiBefore.macd && tiCurrent.macd) {
        if (tiBefore.macd > 0 && tiCurrent.macd < 0) {
            // TODO don't sell if RSI >50
            return true;
        }
    }
}

function buyItMacdHist(tiBefore, tiCurrent) {
    if (tiBefore.macd && tiCurrent.macd) {
        if (tiBefore.macdHist < 0 && tiCurrent.macdHist > 0) {
            // TODO only buy if MACD < 0
            // TODO don't buy if RSI <50
            // TODO only if above SMA50
            return true;//tiCurrent.macd < 2.0 && tiCurrent.rsi < 50.0*/;
        }
    }
}

function sellItMacdHist(tiBefore, tiCurrent) {
    // TODO sell if below SMA50?
    if (tiBefore.macd && tiCurrent.macd) {
        if (tiBefore.macdHist > 0 && tiCurrent.macdHist < 0) {
            // TODO only sell if MACD > 0
            // TODO don't sell if RSI >50
            return true;//tiCurrent.macd > -2.0 /*&& tiCurrent.rsi > 50.0*/;
        }
    }
}

async function trade(symbol, date, buyItFn, sellItFn, strategy) {
    const dailyAdjustedP = getDailyAdjustedFor(symbol, date);
    const tisP = getTechnicalIndicatorsFor(symbol, date);

    const dailyAdjusted = await dailyAdjustedP;
    const { tiBefore, tiCurrent } = await tisP;

    // only trade if symbol is being traded on 'date', and if we have technical indicators for 'date' and day before
    if (dailyAdjusted && date.isSame(dailyAdjusted.date) && tiBefore && tiCurrent) {
        if (tiBefore.rsi && tiCurrent.rsi) {
            if (tiBefore.rsi < 30.0 && tiCurrent.rsi >= 30.0) {
                logger.info('RSI: ' + symbol + ' bullish, leaving oversold on ' + date.format(DATE_FORMAT));
            } else if (tiBefore.rsi > 70.0 && tiCurrent.rsi <= 70.0 && depot[symbol].amount > 0) {
                logger.info('RSI: ' + symbol + ' bearish, leaving overbought on ' + date.format(DATE_FORMAT));
            }
        }

        if (tiBefore.sma200 && tiCurrent.sma200) {
            if (tiBefore.sma50 < tiBefore.sma200 && tiCurrent.sma50 > tiCurrent.sma200) {
                logger.info('GoldenCross: ' + symbol + ' bullish on ' + date.format(DATE_FORMAT));
            } else if (tiBefore.sma50 > tiBefore.sma200 && tiCurrent.sma50 < tiCurrent.sma200) {
                logger.info('GoldenCross: ' + symbol + ' bearish on ' + date.format(DATE_FORMAT));
            }
        }

        if (dailyAdjusted.adjustedClose < tiCurrent.sma50) {
            if (!closedBelowSma50[symbol]) {
                // only log first one of consecutive drops below sma50
                logger.info('SMA50: ' + symbol + ' bearish on ' + date.format(DATE_FORMAT));
            }
            closedBelowSma50[symbol] = true;
        } else {
            closedBelowSma50[symbol] = false;
        }

        const buyIt = buyItFn(tiBefore, tiCurrent);
        const sellIt = sellItFn(tiBefore, tiCurrent);
        // TODO Gewinnmitnahme / stop loss via ATR: https://broker-test.de/trading-news/modifizierter-macd-und-die-average-true-range-35691/
        if (buyIt && !sellIt) {
            logger.info(strategy + ': buy ' + symbol + ' on ' + date.format(DATE_FORMAT));
            return buy(date, symbol, dailyAdjusted);
        } else if (sellIt && !buyIt) {
            logger.info(strategy + ': sell ' + symbol + ' on ' + date.format(DATE_FORMAT));
            return sell(date, symbol, dailyAdjusted);
        } else if (sellIt && buyIt) {
            // shouldn't really happen
            logger.error(date.format(DATE_FORMAT), symbol, 'ambigous signals');
        }
    }
}

async function emulateTrades(fromDate, toDate, symbols) {
    const lastTradingDate = dayjs((await getDailyAdjustedFor(symbols[0], toDate)).date, DATE_FORMAT);
    logger.info('last trading day is ' + lastTradingDate.format(DATE_FORMAT));

    let date = fromDate;
    while (date.isBefore(lastTradingDate) || date.isSame(lastTradingDate)) {
        if (date.day() >= 1 && date.day() <= 5) {
            // only trade Mon-Fri
            const trades = symbols.map(async symbol => {
                try {
                    return await trade(symbol, date, buyItMacdHist, sellItMacdHist, 'MACD');
                } catch (err) {
                    logger.error(date.format(DATE_FORMAT) + ' ' + symbol, err);
                }
            });
            await Promise.all(trades);
        }

        date = date.add(1, 'day');
    }

    // calc profit for remaining shares

    await Promise.all(Object.keys(depot).map(async(symbol) => {
        const stock = depot[symbol];
        if (stock.amount > 0) {
            const sellPrice = (await getDailyAdjustedFor(symbol, lastTradingDate)).adjustedClose;
            const profit = stock.amount * (sellPrice - stock.avgSharePrice);
            // const tax = (profit > 0) ? profit * TAX_RATE : 0.0;
            // cash += (depot[symbol].amount * sellPrice) - TRANSACTION_FEE - tax;
            stock.profit += profit;
        }
    }));

    const symbolsByProfit = Object.keys(depot).sort((symbol1, symbol2) => {
        return depot[symbol1].profit < depot[symbol2].profit ? -1
            : (depot[symbol1].profit > depot[symbol2].profit ? 1 : 0);
    });
    logger.info('depot:');
    symbolsByProfit.forEach(symbol => {
        let stock = depot[symbol];
        if (stock.profit !== 0) {
            stock.avgSharePrice = stock.avgSharePrice.toFixed(2);
            stock.profit = stock.profit.toFixed(2);
            logger.info(symbol, stock);
        }
    });
    logger.info('cash now is ' + FMT.format(cash));

    const depotValue = await calcDepot(lastTradingDate);
    logger.info('depot value is ' + FMT.format(depotValue));
    logger.info('sum of cash+depot is ' + FMT.format(cash + depotValue));
    logger.info('transaction fees / taxes (already included in cash): ' + FMT.format(transactionFees) + '/' + FMT.format(taxes));
}

const args = process.argv.slice(2);
const symbols = (args[0] === '*') ? ALL_SYMBOLS : args[0].split(',');
const from = args[1] || '2021-01-01';
const to = args[2] || dayjs().format(DATE_FORMAT);

logger.info(`emulating trades for ${symbols} from ${from} to ${to} ...`);
emulateTrades(dayjs(from, DATE_FORMAT), dayjs(to, DATE_FORMAT), symbols);
