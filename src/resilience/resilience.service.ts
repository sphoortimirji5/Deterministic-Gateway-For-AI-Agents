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

        this.breaker = new CircuitBreaker(this.executeWithRetry.bind(this), {
            timeout,
            resetTimeout,
            errorThresholdPercentage: 50,
        });

        this.breaker.fallback(async (data: any, error: any) => {
            this.logger.warn(`Fallback triggered! Circuit state: ${this.breaker.opened ? 'OPEN' : 'CLOSED'}`);
            await this.sqsService.pushToRetryQueue({ data, error: error.message });
            return {
                status: 'QUEUED',
                resolution_path: 'SPOOL_TO_SQS',
                message: 'Eligibility request accepted for asynchronous processing',
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
