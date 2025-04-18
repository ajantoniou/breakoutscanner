import { createClient } from '@supabase/supabase-js';
import { MarketDataService } from './MarketDataService';
import { PolygonWebSocket } from '../websocket/PolygonWebSocket';
import { logger } from '../../utils/logger';

export class DataIngestionService {
    private supabase;
    private marketDataService: MarketDataService;
    private polygonWebSocket: PolygonWebSocket;
    private isProcessing: boolean = false;
    private batchSize: number = 100;
    private batchTimeout: number = 5000; // 5 seconds
    private dataBuffer: any[] = [];

    constructor() {
        this.supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        );
        this.marketDataService = new MarketDataService();
        this.polygonWebSocket = new PolygonWebSocket();
        this.initializeWebSocket();
    }

    private initializeWebSocket() {
        this.polygonWebSocket.on('trade', this.handleTrade.bind(this));
        this.polygonWebSocket.on('quote', this.handleQuote.bind(this));
        this.polygonWebSocket.on('aggregate', this.handleAggregate.bind(this));
    }

    private async handleTrade(trade: any) {
        const marketData = {
            symbol: trade.symbol,
            timestamp: new Date(trade.timestamp),
            price: trade.price,
            volume: trade.size,
            source: 'polygon',
            data_type: 'trade'
        };
        await this.bufferData(marketData);
    }

    private async handleQuote(quote: any) {
        const marketData = {
            symbol: quote.symbol,
            timestamp: new Date(quote.timestamp),
            bid: quote.bid,
            ask: quote.ask,
            source: 'polygon',
            data_type: 'quote'
        };
        await this.bufferData(marketData);
    }

    private async handleAggregate(aggregate: any) {
        const marketData = {
            symbol: aggregate.symbol,
            timestamp: new Date(aggregate.timestamp),
            price: aggregate.close,
            volume: aggregate.volume,
            source: 'polygon',
            data_type: 'aggregate',
            timeframe: aggregate.timeframe
        };
        await this.bufferData(marketData);
    }

    private async bufferData(data: any) {
        this.dataBuffer.push(data);
        
        if (this.dataBuffer.length >= this.batchSize) {
            await this.processBatch();
        } else if (!this.isProcessing) {
            setTimeout(() => this.processBatch(), this.batchTimeout);
        }
    }

    private async processBatch() {
        if (this.isProcessing || this.dataBuffer.length === 0) return;

        this.isProcessing = true;
        const batch = this.dataBuffer.splice(0, this.batchSize);

        try {
            const { error } = await this.supabase
                .from('market_data')
                .insert(batch);

            if (error) {
                logger.error('Error inserting market data batch:', error);
                // Requeue failed batch
                this.dataBuffer.unshift(...batch);
            }
        } catch (error) {
            logger.error('Error processing market data batch:', error);
            // Requeue failed batch
            this.dataBuffer.unshift(...batch);
        }

        this.isProcessing = false;

        // Process remaining data if any
        if (this.dataBuffer.length > 0) {
            if (this.dataBuffer.length >= this.batchSize) {
                await this.processBatch();
            } else {
                setTimeout(() => this.processBatch(), this.batchTimeout);
            }
        }
    }

    public async startIngestion(symbols: string[]) {
        try {
            // Subscribe to real-time data
            await this.polygonWebSocket.subscribe(symbols);

            // Fetch historical data for the last 30 days
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

            for (const symbol of symbols) {
                const historicalData = await this.marketDataService.getHistoricalCandles(
                    symbol,
                    thirtyDaysAgo,
                    new Date(),
                    '1m'
                );

                for (const candle of historicalData) {
                    const marketData = {
                        symbol,
                        timestamp: new Date(candle.timestamp),
                        price: candle.close,
                        volume: candle.volume,
                        source: 'polygon',
                        data_type: 'aggregate',
                        timeframe: '1m'
                    };
                    await this.bufferData(marketData);
                }
            }
        } catch (error) {
            logger.error('Error starting data ingestion:', error);
            throw error;
        }
    }

    public async stopIngestion() {
        await this.polygonWebSocket.disconnect();
        // Process any remaining data in the buffer
        if (this.dataBuffer.length > 0) {
            await this.processBatch();
        }
    }
} 