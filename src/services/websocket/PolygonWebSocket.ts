import WebSocket from 'ws';
import { EventEmitter } from 'events';
import { logger } from '../../utils/logger';

export class PolygonWebSocket extends EventEmitter {
    private ws: WebSocket | null = null;
    private apiKey: string;
    private reconnectAttempts: number = 0;
    private maxReconnectAttempts: number = 5;
    private reconnectDelay: number = 5000; // 5 seconds
    private heartbeatInterval: NodeJS.Timeout | null = null;
    private subscribedSymbols: Set<string> = new Set();

    constructor() {
        super();
        this.apiKey = process.env.POLYGON_API_KEY!;
        if (!this.apiKey) {
            throw new Error('POLYGON_API_KEY environment variable is not set');
        }
    }

    public async connect() {
        if (this.ws) {
            logger.warn('WebSocket connection already exists');
            return;
        }

        try {
            this.ws = new WebSocket('wss://delayed.polygon.io/stocks');

            this.ws.on('open', () => {
                logger.info('Connected to Polygon WebSocket');
                this.reconnectAttempts = 0;
                this.authenticate();
                this.startHeartbeat();
            });

            this.ws.on('message', (data: string) => {
                this.handleMessage(data);
            });

            this.ws.on('close', () => {
                logger.warn('WebSocket connection closed');
                this.handleDisconnect();
            });

            this.ws.on('error', (error) => {
                logger.error('WebSocket error:', error);
                this.handleDisconnect();
            });
        } catch (error) {
            logger.error('Error connecting to Polygon WebSocket:', error);
            this.handleDisconnect();
        }
    }

    private authenticate() {
        if (!this.ws) return;

        const authMessage = {
            action: 'auth',
            params: this.apiKey
        };

        this.ws.send(JSON.stringify(authMessage));
    }

    private startHeartbeat() {
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
        }

        this.heartbeatInterval = setInterval(() => {
            if (this.ws && this.ws.readyState === WebSocket.OPEN) {
                this.ws.send(JSON.stringify({ action: 'ping' }));
            }
        }, 30000); // Send heartbeat every 30 seconds
    }

    private handleMessage(data: string) {
        try {
            const message = JSON.parse(data);

            if (message.ev === 'status') {
                logger.info('Polygon WebSocket status:', message.message);
                return;
            }

            if (message.ev === 'error') {
                logger.error('Polygon WebSocket error:', message.message);
                return;
            }

            // Emit the appropriate event based on the message type
            switch (message.ev) {
                case 'T':
                    this.emit('trade', message);
                    break;
                case 'Q':
                    this.emit('quote', message);
                    break;
                case 'A':
                    this.emit('aggregate', message);
                    break;
                default:
                    logger.debug('Unhandled message type:', message.ev);
            }
        } catch (error) {
            logger.error('Error handling WebSocket message:', error);
        }
    }

    private handleDisconnect() {
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
            this.heartbeatInterval = null;
        }

        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            logger.info(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
            setTimeout(() => this.connect(), this.reconnectDelay);
        } else {
            logger.error('Max reconnection attempts reached');
            this.emit('error', new Error('Max reconnection attempts reached'));
        }
    }

    public async subscribe(symbols: string[]) {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
            await this.connect();
        }

        const newSymbols = symbols.filter(symbol => !this.subscribedSymbols.has(symbol));
        if (newSymbols.length === 0) {
            logger.info('All symbols already subscribed');
            return;
        }

        const subscribeMessage = {
            action: 'subscribe',
            params: newSymbols.map(symbol => `T.${symbol},Q.${symbol},A.${symbol}`).join(',')
        };

        this.ws!.send(JSON.stringify(subscribeMessage));
        newSymbols.forEach(symbol => this.subscribedSymbols.add(symbol));
        logger.info(`Subscribed to ${newSymbols.length} new symbols`);
    }

    public async unsubscribe(symbols: string[]) {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

        const unsubscribeMessage = {
            action: 'unsubscribe',
            params: symbols.map(symbol => `T.${symbol},Q.${symbol},A.${symbol}`).join(',')
        };

        this.ws.send(JSON.stringify(unsubscribeMessage));
        symbols.forEach(symbol => this.subscribedSymbols.delete(symbol));
        logger.info(`Unsubscribed from ${symbols.length} symbols`);
    }

    public async disconnect() {
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
            this.heartbeatInterval = null;
        }

        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }

        this.subscribedSymbols.clear();
        logger.info('Disconnected from Polygon WebSocket');
    }
} 