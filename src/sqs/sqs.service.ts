import { Injectable, Logger } from '@nestjs/common';
import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class SQSService {
    private sqsClient: SQSClient;
    private readonly logger = new Logger(SQSService.name);
    private readonly queueUrl: string;

    constructor(private readonly configService: ConfigService) {
        const region = this.configService.get<string>('AWS_REGION') || 'us-east-1';
        this.queueUrl = this.configService.get<string>('SQS_QUEUE_URL') || 'eligibility-retry-queue';

        this.sqsClient = new SQSClient({ region });
    }

    async pushToRetryQueue(payload: any) {
        this.logger.warn(`Pushing request to Retry Queue: ${JSON.stringify(payload)}`);
        this.logger.log('Successfully pushed to SQS Retry Queue (simulated)');
    }

    async pushToDLQ(payload: any) {
        this.logger.error(`CRITICAL: Pushing request to DLQ after exhaustion: ${JSON.stringify(payload)}`);
        this.logger.log('Successfully pushed to SQS DLQ (simulated)');
    }
}
