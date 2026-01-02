import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { EligibilityService } from './eligibility/eligibility.service';
import { SQSService } from './sqs/sqs.service';
import { ResilienceService } from './resilience/resilience.service';
import { AppController } from './app.controller';

@Module({
    imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        ThrottlerModule.forRoot([{
            ttl: 60000,
            limit: 10, // 10 requests per minute per IP
        }]),
    ],
    controllers: [AppController],
    providers: [
        {
            provide: 'IEligibilityService',
            useClass: EligibilityService,
        },
        SQSService,
        ResilienceService,
    ],
})
export class AppModule { }
