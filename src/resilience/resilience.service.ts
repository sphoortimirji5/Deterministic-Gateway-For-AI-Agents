import { Injectable, Inject, OnModuleInit, Logger } from '@nestjs/common';
import { IEligibilityService } from '../interfaces/eligibility.interface';
import { SQSService } from '../sqs/sqs.service';
import CircuitBreaker from 'opossum';
import { defer, lastValueFrom, timer } from 'rxjs';
import { catchError, retry } from 'rxjs/operators';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class ResilienceService implements OnModuleInit {
    private breaker!: CircuitBreaker;
    private readonly logger = new Logger(ResilienceService.name);

    constructor(
        @Inject('IEligibilityService') private readonly eligibilityService: IEligibilityService,
        private readonly sqsService: SQSService,
        private readonly configService: ConfigService,
    ) { }

    onModuleInit() {
        const timeout = this.configService.get<number>('CB_TIMEOUT') || 5000;
        const resetTimeout = this.configService.get<number>('CB_RESET_TIMEOUT') || 10000;
        const errorThresholdPercentage = this.configService.get<number>('CB_ERROR_THRESHOLD') || 50;
        const volumeThreshold = this.configService.get<number>('CB_VOLUME_THRESHOLD') || 100;
        const rollingCountTimeout = this.configService.get<number>('CB_WINDOW') || 10000;

        this.breaker = new CircuitBreaker(this.executeWithRetry.bind(this), {
            timeout,
            resetTimeout,
            errorThresholdPercentage,
            volumeThreshold,
            rollingCountTimeout,
        });

        this.breaker.fallback(async (data: any, error: any) => {
            const isExhausted = error.message.includes('All retries exhausted');
            this.logger.warn(`Fallback triggered! Circuit state: ${this.breaker.opened ? 'OPEN' : 'CLOSED'} | Type: ${isExhausted ? 'DLQ' : 'RETRY'}`);

            if (isExhausted) {
                await this.sqsService.pushToDLQ({ data, error: error.message });
            } else {
                await this.sqsService.pushToRetryQueue({ data, error: error.message });
            }

            return {
                status: 'QUEUED',
                resolution_path: 'SPOOL_TO_SQS',
                message: isExhausted ? 'Request failed and moved to DLQ' : 'Request queued for retry',
                reason: error.message
            };
        });

        this.breaker.on('open', () => this.logger.error('CIRCUIT BREAKER: OPEN'));
        this.breaker.on('close', () => this.logger.log('CIRCUIT BREAKER: CLOSED'));
    }

    async execute(data: any) {
        return this.breaker.fire(data);
    }

    private async executeWithRetry(data: any) {
        const source$ = defer(() => this.eligibilityService.verify(data)).pipe(
            retry({
                count: 3,
                delay: (error, retryCount) => {
                    const backoffTime = Math.pow(2, retryCount - 1) * 1000;
                    this.logger.debug(`Retry attempt ${retryCount} after ${backoffTime}ms`);
                    return timer(backoffTime);
                },
            }),
            catchError((error) => {
                this.logger.error(`All retries exhausted: ${error.message}`);
                throw error;
            })
        );

        return lastValueFrom(source$);
    }
}
