'use strict';

const dynamoose = require('dynamoose');
dynamoose.aws.sdk.config.update({ region: 'eu-west-1' });

const CONFIG_CREATE = false;
const CONFIG_PREFIX = 'stonks-';
const CONFIG_WAIT_FOR_ACTIVE = false;

// see https://github.com/dynamoose/dynamoose/issues/209#issuecomment-374258965
async function handleThroughput(callback, params, attempt = 1) {
    const BACK_OFF = 500; // back off base time in millis
    const CAP = 10000; // max. back off time in millis

    try {
        return await callback(params);
    } catch (e) {
        if (e.code === 'ProvisionedThroughputExceededException') {
            // exponential backoff with jitter,
            // see https://aws.amazon.com/de/blogs/architecture/exponential-backoff-and-jitter/
            const temp = Math.min(CAP, BACK_OFF * Math.pow(2, attempt));
            const sleep = temp / 2 + Math.floor(Math.random() * temp / 2);
            console.log('*** sleeping for ' + sleep + ' on attempt ' + attempt + ', temp ' + temp);
            await new Promise(resolve => setTimeout(resolve, sleep));
            return handleThroughput(callback, params, ++attempt);
        } else throw e;
    }
}

var exports = module.exports = {};

exports.handleThroughput = async function(callback, params) {
    return handleThroughput(callback, params);
};

exports.CompanyOverview = dynamoose.model('CompanyOverview',
    new dynamoose.Schema({
        symbol: {
            type: String,
            validate: (symbol) => symbol.length > 0,
            required: true,
        },
    }, {
        saveUnknown: true,
        timestamps: true,
    }),
    {
        create: CONFIG_CREATE,
        prefix: CONFIG_PREFIX,
        waitForActive: CONFIG_WAIT_FOR_ACTIVE,
    });

exports.DailyAdjusted = dynamoose.model('DailyAdjusted',
    new dynamoose.Schema({
        symbol: {
            type: String,
            validate: (symbol) => symbol.length > 0,
            required: true,
        },
        date: {
            type: String,
            validate: (date) => date.length > 0,
            required: true,
            rangeKey: true,
        },
        open: {
            type: Number,
            validate: (open) => open >= 0,
            required: true,
        },
        high: {
            type: Number,
            validate: (high) => high >= 0,
            required: true,
        },
        low: {
            type: Number,
            validate: (low) => low >= 0,
            required: true,
        },
        close: {
            type: Number,
            validate: (close) => close >= 0,
            required: true,
        },
        adjustedClose: {
            type: Number,
            validate: (adjustedClose) => adjustedClose >= 0,
            required: true,
        },
        volume: {
            type: Number,
            validate: (volume) => volume >= 0,
            required: true,
        },
        dividendAmount: {
            type: Number,
            validate: (dividendAmount) => dividendAmount >= 0,
            required: true,
        },
        splitCoefficient: {
            type: Number,
            validate: (splitCoefficient) => splitCoefficient >= 0,
            required: true,
        },
    }, {
        timestamps: true,
    }),
    {
        create: CONFIG_CREATE,
        prefix: CONFIG_PREFIX,
        waitForActive: CONFIG_WAIT_FOR_ACTIVE,
    });

exports.SMA15 = dynamoose.model('SMA15',
    new dynamoose.Schema({
        symbol: {
            type: String,
            validate: (symbol) => symbol.length > 0,
            required: true,
        },
        date: {
            type: String,
            validate: (date) => date.length > 0,
            required: true,
            rangeKey: true,
        },
        sma: {
            type: Number,
            validate: (sma) => sma >= 0,
            required: true,
        },
    }, {
        timestamps: true,
    }),
    {
        create: CONFIG_CREATE,
        prefix: CONFIG_PREFIX,
        waitForActive: CONFIG_WAIT_FOR_ACTIVE,
    });

exports.SMA50 = dynamoose.model('SMA50',
    new dynamoose.Schema({
        symbol: {
            type: String,
            validate: (symbol) => symbol.length > 0,
            required: true,
        },
        date: {
            type: String,
            validate: (date) => date.length > 0,
            required: true,
            rangeKey: true,
        },
        sma: {
            type: Number,
            validate: (sma) => sma >= 0,
            required: true,
        },
    }, {
        timestamps: true,
    }),
    {
        create: CONFIG_CREATE,
        prefix: CONFIG_PREFIX,
        waitForActive: CONFIG_WAIT_FOR_ACTIVE,
    });

exports.EMA12 = dynamoose.model('EMA12',
    new dynamoose.Schema({
        symbol: {
            type: String,
            validate: (symbol) => symbol.length > 0,
            required: true,
        },
        date: {
            type: String,
            validate: (date) => date.length > 0,
            required: true,
            rangeKey: true,
        },
        ema: {
            type: Number,
            validate: (ema) => ema >= 0,
            required: true,
        },
    }, {
        timestamps: true,
    }),
    {
        create: CONFIG_CREATE,
        prefix: CONFIG_PREFIX,
        waitForActive: CONFIG_WAIT_FOR_ACTIVE,
    });

exports.EMA26 = dynamoose.model('EMA26',
    new dynamoose.Schema({
        symbol: {
            type: String,
            validate: (symbol) => symbol.length > 0,
            required: true,
        },
        date: {
            type: String,
            validate: (date) => date.length > 0,
            required: true,
            rangeKey: true,
        },
        ema: {
            type: Number,
            validate: (ema) => ema >= 0,
            required: true,
        },
    }, {
        timestamps: true,
    }),
    {
        create: CONFIG_CREATE,
        prefix: CONFIG_PREFIX,
        waitForActive: CONFIG_WAIT_FOR_ACTIVE,
    });

exports.EMA50 = dynamoose.model('EMA50',
    new dynamoose.Schema({
        symbol: {
            type: String,
            validate: (symbol) => symbol.length > 0,
            required: true,
        },
        date: {
            type: String,
            validate: (date) => date.length > 0,
            required: true,
            rangeKey: true,
        },
        ema: {
            type: Number,
            validate: (ema) => ema >= 0,
            required: true,
        },
    }, {
        timestamps: true,
    }),
    {
        create: CONFIG_CREATE,
        prefix: CONFIG_PREFIX,
        waitForActive: CONFIG_WAIT_FOR_ACTIVE,
    });

exports.EMA200 = dynamoose.model('EMA200',
    new dynamoose.Schema({
        symbol: {
            type: String,
            validate: (symbol) => symbol.length > 0,
            required: true,
        },
        date: {
            type: String,
            validate: (date) => date.length > 0,
            required: true,
            rangeKey: true,
        },
        ema: {
            type: Number,
            validate: (ema) => ema >= 0,
            required: true,
        },
    }, {
        timestamps: true,
    }),
    {
        create: CONFIG_CREATE,
        prefix: CONFIG_PREFIX,
        waitForActive: CONFIG_WAIT_FOR_ACTIVE,
    });

exports.MACD = dynamoose.model('MACD',
    new dynamoose.Schema({
        symbol: {
            type: String,
            validate: (symbol) => symbol.length > 0,
            required: true,
        },
        date: {
            type: String,
            validate: (date) => date.length > 0,
            required: true,
            rangeKey: true,
        },
        macd: {
            type: Number,
            required: true,
        },
        hist: {
            type: Number,
            required: true,
        },
        signal: {
            type: Number,
            required: true,
        },
    }, {
        timestamps: true,
    }),
    {
        create: CONFIG_CREATE,
        prefix: CONFIG_PREFIX,
        waitForActive: CONFIG_WAIT_FOR_ACTIVE,
    });

exports.RSI = dynamoose.model('RSI',
    new dynamoose.Schema({
        symbol: {
            type: String,
            validate: (symbol) => symbol.length > 0,
            required: true,
        },
        date: {
            type: String,
            validate: (date) => date.length > 0,
            required: true,
            rangeKey: true,
        },
        rsi: {
            type: Number,
            validate: (rsi) => rsi >= 0.0 && rsi <= 100.0,
            required: true,
        },
    }, {
        timestamps: true,
    }),
    {
        create: CONFIG_CREATE,
        prefix: CONFIG_PREFIX,
        waitForActive: CONFIG_WAIT_FOR_ACTIVE,
    });

exports.BBands = dynamoose.model('BBands',
    new dynamoose.Schema({
        symbol: {
            type: String,
            validate: (symbol) => symbol.length > 0,
            required: true,
        },
        date: {
            type: String,
            validate: (date) => date.length > 0,
            required: true,
            rangeKey: true,
        },
        lower: {
            type: Number,
            required: true,
        },
        upper: {
            type: Number,
            required: true,
        },
        middle: {
            type: Number,
            required: true,
        },
    }, {
        timestamps: true,
    }),
    {
        create: CONFIG_CREATE,
        prefix: CONFIG_PREFIX,
        waitForActive: CONFIG_WAIT_FOR_ACTIVE,
    });
