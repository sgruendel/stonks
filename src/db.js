import dynamoose from 'dynamoose';
const ddb = new dynamoose.aws.ddb.DynamoDB({ region: 'eu-west-1' });
dynamoose.aws.ddb.set(ddb);

import winston from 'winston';

const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    transports: [
        new winston.transports.Console({
            format: winston.format.simple(),
        }),
    ],
    exitOnError: false,
});

const CONFIG_CREATE = false;
const CONFIG_PREFIX = 'stonks-';
const CONFIG_WAIT_FOR_ACTIVE = false;

// see https://github.com/dynamoose/dynamoose/issues/209#issuecomment-374258965
async function _handleThroughput(callback, params, attempt = 1) {
    const BACK_OFF = 500; // back off base time in millis
    const CAP = 10000; // max. back off time in millis

    try {
        return await callback(params);
    } catch (e) {
        if (e.__type && e.__type.endsWith('#ProvisionedThroughputExceededException')) {
            // exponential backoff with jitter,
            // see https://aws.amazon.com/de/blogs/architecture/exponential-backoff-and-jitter/
            const temp = Math.min(CAP, BACK_OFF * Math.pow(2, attempt));
            const sleep = temp / 2 + Math.floor((Math.random() * temp) / 2);
            logger.debug('DynamoDB: sleeping for ' + sleep + ' on attempt ' + attempt + ', temp ' + temp);
            await new Promise((resolve) => setTimeout(resolve, sleep));
            return _handleThroughput(callback, params, ++attempt);
        } else throw e;
    }
}

export async function handleThroughput(callback, params) {
    return _handleThroughput(callback, params);
};

export const CompanyOverviewSchema = {
    symbol: {
        type: String,
        validate: (symbol) => symbol.length > 0,
        required: true,
    },
};

export const CompanyOverview = dynamoose.model(
    'CompanyOverview',
    new dynamoose.Schema(CompanyOverviewSchema, {
        saveUnknown: true,
        timestamps: true,
    }),
    {
        create: CONFIG_CREATE,
        prefix: CONFIG_PREFIX,
        waitForActive: CONFIG_WAIT_FOR_ACTIVE,
    },
);

export const DailyAdjustedSchema = {
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
};
export const DailyAdjusted = dynamoose.model(
    'DailyAdjusted',
    new dynamoose.Schema(DailyAdjustedSchema, {
        timestamps: true,
    }),
    {
        create: CONFIG_CREATE,
        prefix: CONFIG_PREFIX,
        waitForActive: CONFIG_WAIT_FOR_ACTIVE,
    },
);

export const TechnicalIndicatorsSchema = {
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
    sma15: {
        type: Number,
        validate: (sma) => sma >= 0,
    },
    sma20: {
        type: Number,
        validate: (sma) => sma >= 0,
    },
    sma50: {
        type: Number,
        validate: (sma) => sma >= 0,
    },
    sma100: {
        type: Number,
        validate: (sma) => sma >= 0,
    },
    sma200: {
        type: Number,
        validate: (sma) => sma >= 0,
    },
    ema12: {
        type: Number,
        validate: (ema) => ema >= 0,
    },
    ema20: {
        type: Number,
        validate: (ema) => ema >= 0,
    },
    ema26: {
        type: Number,
        validate: (ema) => ema >= 0,
    },
    ema50: {
        type: Number,
        validate: (ema) => ema >= 0,
    },
    ema100: {
        type: Number,
        validate: (ema) => ema >= 0,
    },
    ema200: {
        type: Number,
        validate: (ema) => ema >= 0,
    },
    macd: {
        type: Number,
    },
    macdHist: {
        type: Number,
    },
    macdSignal: {
        type: Number,
    },
    rsi: {
        type: Number,
        validate: (rsi) => rsi >= 0.0 && rsi <= 100.0,
    },
    bbandLower: {
        type: Number,
    },
    bbandUpper: {
        type: Number,
    },
    bbandMiddle: {
        type: Number,
    },
};
export const TechnicalIndicators = dynamoose.model(
    'TechnicalIndicators',
    new dynamoose.Schema(TechnicalIndicatorsSchema, {
        timestamps: true,
    }),
    {
        create: CONFIG_CREATE,
        prefix: CONFIG_PREFIX,
        waitForActive: CONFIG_WAIT_FOR_ACTIVE,
    },
);
