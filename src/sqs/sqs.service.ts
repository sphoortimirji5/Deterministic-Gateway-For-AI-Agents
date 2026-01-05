import { Injectable, Logger } from '@nestjs/common';
import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';
import { ConfigService } from '@nestjs/config';
import { scrubPHI } from '../common/utils/phi-scrubber';

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
        const scrubbedPayload = scrubPHI(payload);
        this.logger.warn(`Pushing request to Retry Queue: ${JSON.stringify(scrubbedPayload)}`);
        this.logger.log('Successfully pushed to SQS Retry Queue (simulated)');
    }

    async pushToDLQ(payload: any) {
        const scrubbedPayload = scrubPHI(payload);
        this.logger.error(`CRITICAL: Pushing request to DLQ after exhaustion: ${JSON.stringify(scrubbedPayload)}`);
        this.logger.log('Successfully pushed to SQS DLQ (simulated)');
    }
}
