/**
 * Advanced Chart Analytics Utilities
 * Provides calculation functions for technical indicators, forecasting, and statistical analysis
 */

// ============================================================================
// TYPES
// ============================================================================

export interface DataPoint {
    time: number;
    active: number;
    recovered: number;
    escalated: number;
    cumulativeActive?: number;
    cumulativeRecovered?: number;
    cumulativeEscalated?: number;
}

export interface BollingerBands {
    upper: number;
    middle: number;
    lower: number;
    bandwidth: number;
}

export interface MACDResult {
    macd: number;
    signal: number;
    histogram: number;
}

export interface AnomalyPoint {
    index: number;
    time: number;
    value: number;
    zScore: number;
    metric: 'active' | 'recovered' | 'escalated';
}

export interface CorrelationMatrix {
    activeRecovered: number;
    activeEscalated: number;
    recoveredEscalated: number;
}

export interface LinearRegressionResult {
    slope: number;
    intercept: number;
    rSquared: number;
}

export interface ForecastPoint {
    time: number;
    predicted: number;
    upperBound: number;
    lowerBound: number;
}

export interface SeasonalDecomposition {
    trend: number[];
    seasonal: number[];
    residual: number[];
}

export interface OHLCData {
    time: number;
    open: number;
    high: number;
    low: number;
    close: number;
    volume?: number;
}

// ============================================================================
// BASIC STATISTICAL FUNCTIONS
// ============================================================================

/**
 * Calculate mean of an array
 */
export const mean = (arr: number[]): number => {
    if (arr.length === 0) return 0;
    return arr.reduce((sum, val) => sum + val, 0) / arr.length;
};

/**
 * Calculate standard deviation of an array
 */
export const standardDeviation = (arr: number[]): number => {
    if (arr.length === 0) return 0;
    const avg = mean(arr);
    const squaredDiffs = arr.map(val => Math.pow(val - avg, 2));
    return Math.sqrt(mean(squaredDiffs));
};

/**
 * Calculate Simple Moving Average
 */
export const SMA = (data: number[], period: number): number[] => {
    const result: number[] = [];
    for (let i = 0; i < data.length; i++) {
        if (i < period - 1) {
            result.push(NaN);
        } else {
            const slice = data.slice(i - period + 1, i + 1);
            result.push(mean(slice));
        }
    }
    return result;
};

/**
 * Calculate Exponential Moving Average
 */
export const EMA = (data: number[], period: number): number[] => {
    const result: number[] = [];
    const multiplier = 2 / (period + 1);

    // Start with SMA for the first value
    let prevEMA = mean(data.slice(0, period));

    for (let i = 0; i < data.length; i++) {
        if (i < period - 1) {
            result.push(NaN);
        } else if (i === period - 1) {
            result.push(prevEMA);
        } else {
            const ema = (data[i] - prevEMA) * multiplier + prevEMA;
            result.push(ema);
            prevEMA = ema;
        }
    }
    return result;
};

// ============================================================================
// TECHNICAL INDICATORS
// ============================================================================

/**
 * Calculate Bollinger Bands
 * @param data - Array of values
 * @param period - Number of periods for moving average (default: 20)
 * @param stdDevMultiplier - Number of standard deviations (default: 2)
 */
export const calculateBollingerBands = (
    data: number[],
    period: number = 20,
    stdDevMultiplier: number = 2
): BollingerBands[] => {
    const result: BollingerBands[] = [];

    for (let i = 0; i < data.length; i++) {
        if (i < period - 1) {
            result.push({ upper: NaN, middle: NaN, lower: NaN, bandwidth: NaN });
        } else {
            const slice = data.slice(i - period + 1, i + 1);
            const sma = mean(slice);
            const stdDev = standardDeviation(slice);

            const upper = sma + stdDevMultiplier * stdDev;
            const lower = sma - stdDevMultiplier * stdDev;
            const bandwidth = sma > 0 ? ((upper - lower) / sma) * 100 : 0;

            result.push({ upper, middle: sma, lower, bandwidth });
        }
    }

    return result;
};

/**
 * Calculate Relative Strength Index (RSI)
 * @param data - Array of values
 * @param period - Number of periods (default: 14)
 */
export const calculateRSI = (data: number[], period: number = 14): number[] => {
    const result: number[] = [];
    const gains: number[] = [];
    const losses: number[] = [];

    // Calculate price changes
    for (let i = 1; i < data.length; i++) {
        const change = data[i] - data[i - 1];
        gains.push(change > 0 ? change : 0);
        losses.push(change < 0 ? Math.abs(change) : 0);
    }

    // Calculate RSI
    result.push(NaN); // First value has no previous

    for (let i = 0; i < gains.length; i++) {
        if (i < period - 1) {
            result.push(NaN);
        } else if (i === period - 1) {
            // First RSI value uses simple average
            const avgGain = mean(gains.slice(0, period));
            const avgLoss = mean(losses.slice(0, period));
            const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
            result.push(100 - (100 / (1 + rs)));
        } else {
            // Subsequent values use smoothed average
            const prevAvgGain = gains.slice(i - period, i).reduce((a, b) => a + b, 0) / period;
            const prevAvgLoss = losses.slice(i - period, i).reduce((a, b) => a + b, 0) / period;

            const avgGain = (prevAvgGain * (period - 1) + gains[i]) / period;
            const avgLoss = (prevAvgLoss * (period - 1) + losses[i]) / period;

            const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
            result.push(100 - (100 / (1 + rs)));
        }
    }

    return result;
};

/**
 * Calculate MACD (Moving Average Convergence Divergence)
 * @param data - Array of values
 * @param fastPeriod - Fast EMA period (default: 12)
 * @param slowPeriod - Slow EMA period (default: 26)
 * @param signalPeriod - Signal line period (default: 9)
 */
export const calculateMACD = (
    data: number[],
    fastPeriod: number = 12,
    slowPeriod: number = 26,
    signalPeriod: number = 9
): MACDResult[] => {
    const fastEMA = EMA(data, fastPeriod);
    const slowEMA = EMA(data, slowPeriod);

    // MACD Line = Fast EMA - Slow EMA
    const macdLine = fastEMA.map((fast, i) => fast - slowEMA[i]);

    // Signal Line = EMA of MACD Line
    const validMacd = macdLine.filter(v => !isNaN(v));
    const signalLineRaw = EMA(validMacd, signalPeriod);

    // Pad signal line to match original length
    const signalLine: number[] = [];
    let signalIndex = 0;
    for (let i = 0; i < macdLine.length; i++) {
        if (isNaN(macdLine[i])) {
            signalLine.push(NaN);
        } else {
            signalLine.push(signalLineRaw[signalIndex++] || NaN);
        }
    }

    // Histogram = MACD Line - Signal Line
    const result: MACDResult[] = macdLine.map((macd, i) => ({
        macd: macd,
        signal: signalLine[i],
        histogram: macd - signalLine[i]
    }));

    return result;
};

// ============================================================================
// ANOMALY DETECTION
// ============================================================================

/**
 * Detect anomalies using Z-score method
 * @param data - Array of data points
 * @param threshold - Z-score threshold (default: 2.5)
 * @param metric - Which metric to analyze
 */
export const detectAnomalies = (
    data: DataPoint[],
    threshold: number = 2.5,
    metric: 'active' | 'recovered' | 'escalated' = 'active'
): AnomalyPoint[] => {
    const values = data.map(d => d[metric]);
    const avg = mean(values);
    const stdDev = standardDeviation(values);

    if (stdDev === 0) return [];

    const anomalies: AnomalyPoint[] = [];

    values.forEach((value, index) => {
        const zScore = (value - avg) / stdDev;
        if (Math.abs(zScore) > threshold) {
            anomalies.push({
                index,
                time: data[index].time,
                value,
                zScore,
                metric
            });
        }
    });

    return anomalies;
};

/**
 * Detect all anomalies across all metrics
 */
export const detectAllAnomalies = (
    data: DataPoint[],
    threshold: number = 2.5
): AnomalyPoint[] => {
    return [
        ...detectAnomalies(data, threshold, 'active'),
        ...detectAnomalies(data, threshold, 'recovered'),
        ...detectAnomalies(data, threshold, 'escalated')
    ].sort((a, b) => a.time - b.time);
};

// ============================================================================
// CORRELATION ANALYSIS
// ============================================================================

/**
 * Calculate Pearson correlation coefficient between two arrays
 */
export const pearsonCorrelation = (x: number[], y: number[]): number => {
    if (x.length !== y.length || x.length === 0) return 0;

    const n = x.length;
    const meanX = mean(x);
    const meanY = mean(y);

    let numerator = 0;
    let sumXSquared = 0;
    let sumYSquared = 0;

    for (let i = 0; i < n; i++) {
        const diffX = x[i] - meanX;
        const diffY = y[i] - meanY;
        numerator += diffX * diffY;
        sumXSquared += diffX * diffX;
        sumYSquared += diffY * diffY;
    }

    const denominator = Math.sqrt(sumXSquared * sumYSquared);
    return denominator === 0 ? 0 : numerator / denominator;
};

/**
 * Calculate correlation matrix between Active, Recovered, Escalated
 */
export const calculateCorrelationMatrix = (data: DataPoint[]): CorrelationMatrix => {
    const active = data.map(d => d.active);
    const recovered = data.map(d => d.recovered);
    const escalated = data.map(d => d.escalated);

    return {
        activeRecovered: pearsonCorrelation(active, recovered),
        activeEscalated: pearsonCorrelation(active, escalated),
        recoveredEscalated: pearsonCorrelation(recovered, escalated)
    };
};

// ============================================================================
// FORECASTING
// ============================================================================

/**
 * Calculate linear regression (least squares)
 */
export const linearRegression = (data: number[]): LinearRegressionResult => {
    const n = data.length;
    if (n === 0) return { slope: 0, intercept: 0, rSquared: 0 };

    // X values are indices (0, 1, 2, ...)
    const xMean = (n - 1) / 2;
    const yMean = mean(data);

    let numerator = 0;
    let denominator = 0;

    for (let i = 0; i < n; i++) {
        numerator += (i - xMean) * (data[i] - yMean);
        denominator += (i - xMean) * (i - xMean);
    }

    const slope = denominator === 0 ? 0 : numerator / denominator;
    const intercept = yMean - slope * xMean;

    // Calculate R-squared
    let ssRes = 0;
    let ssTot = 0;

    for (let i = 0; i < n; i++) {
        const predicted = slope * i + intercept;
        ssRes += Math.pow(data[i] - predicted, 2);
        ssTot += Math.pow(data[i] - yMean, 2);
    }

    const rSquared = ssTot === 0 ? 1 : 1 - (ssRes / ssTot);

    return { slope, intercept, rSquared };
};

/**
 * Project trend into the future
 * @param data - Historical data
 * @param futurePoints - Number of future points to project
 * @param confidence - Confidence level (0.9 = 90%)
 */
export const projectTrend = (
    data: DataPoint[],
    futurePoints: number = 10,
    confidence: number = 0.95
): ForecastPoint[] => {
    const values = data.map(d => d.active);
    const regression = linearRegression(values);
    const stdDev = standardDeviation(values);

    // Z-score for confidence interval
    const zScore = confidence === 0.95 ? 1.96 : confidence === 0.99 ? 2.576 : 1.645;

    const forecasts: ForecastPoint[] = [];
    const lastTime = data.length > 0 ? data[data.length - 1].time : 0;

    for (let i = 1; i <= futurePoints; i++) {
        const x = data.length + i - 1;
        const predicted = regression.slope * x + regression.intercept;

        // Wider interval as we project further (sqrt(i) factor)
        const margin = zScore * stdDev * Math.sqrt(1 + 1 / data.length + Math.pow(i, 2) / 12);

        forecasts.push({
            time: lastTime + i,
            predicted,
            upperBound: predicted + margin,
            lowerBound: Math.max(0, predicted - margin)
        });
    }

    return forecasts;
};

/**
 * Simple seasonal decomposition (moving average based)
 * @param data - Array of values
 * @param seasonLength - Expected season length (default: 7 for weekly)
 */
export const seasonalDecompose = (
    data: number[],
    seasonLength: number = 7
): SeasonalDecomposition => {
    // Calculate trend using centered moving average
    const trend = SMA(data, seasonLength);

    // Calculate seasonal component
    const detrended = data.map((val, i) => isNaN(trend[i]) ? 0 : val - trend[i]);

    // Average seasonal effect for each position in cycle
    const seasonalEffects: number[] = [];
    for (let pos = 0; pos < seasonLength; pos++) {
        const effects: number[] = [];
        for (let i = pos; i < detrended.length; i += seasonLength) {
            if (!isNaN(detrended[i]) && detrended[i] !== 0) {
                effects.push(detrended[i]);
            }
        }
        seasonalEffects.push(mean(effects));
    }

    // Apply seasonal component to each data point
    const seasonal = data.map((_, i) => seasonalEffects[i % seasonLength] || 0);

    // Residual = Data - Trend - Seasonal
    const residual = data.map((val, i) => {
        const t = isNaN(trend[i]) ? 0 : trend[i];
        return val - t - seasonal[i];
    });

    return { trend, seasonal, residual };
};

// ============================================================================
// DATA AGGREGATION (for Candlestick)
// ============================================================================

/**
 * Aggregate data into OHLC format
 * @param data - Raw data points
 * @param bucketSize - Number of points per bucket
 * @param metric - Which metric to aggregate
 */
export const aggregateToOHLC = (
    data: DataPoint[],
    bucketSize: number = 10,
    metric: 'active' | 'recovered' | 'escalated' = 'active'
): OHLCData[] => {
    const result: OHLCData[] = [];

    for (let i = 0; i < data.length; i += bucketSize) {
        const bucket = data.slice(i, Math.min(i + bucketSize, data.length));
        if (bucket.length === 0) continue;

        const values = bucket.map(d => d[metric]);

        result.push({
            time: bucket[0].time,
            open: values[0],
            high: Math.max(...values),
            low: Math.min(...values),
            close: values[values.length - 1],
            volume: values.reduce((a, b) => a + b, 0)
        });
    }

    return result;
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Normalize values to 0-100 range
 */
export const normalize = (data: number[]): number[] => {
    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min;

    if (range === 0) return data.map(() => 50);
    return data.map(val => ((val - min) / range) * 100);
};

/**
 * Calculate percentage change
 */
export const percentageChange = (data: number[]): number[] => {
    return data.map((val, i) => {
        if (i === 0 || data[i - 1] === 0) return 0;
        return ((val - data[i - 1]) / data[i - 1]) * 100;
    });
};

/**
 * Get color based on value (for heatmaps)
 */
export const getHeatmapColor = (value: number, min: number, max: number): string => {
    const normalized = max === min ? 0.5 : (value - min) / (max - min);

    // Blue (low) -> Purple (mid) -> Red (high)
    if (normalized < 0.5) {
        const t = normalized * 2;
        return `rgb(${Math.round(59 + t * (128 - 59))}, ${Math.round(130 - t * 40)}, ${Math.round(246 - t * 100)})`;
    } else {
        const t = (normalized - 0.5) * 2;
        return `rgb(${Math.round(128 + t * (239 - 128))}, ${Math.round(90 - t * 22)}, ${Math.round(146 + t * (68 - 146))})`;
    }
};
