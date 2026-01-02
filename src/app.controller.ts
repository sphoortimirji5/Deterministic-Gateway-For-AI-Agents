import { Controller, Post, Body, UseInterceptors, UseGuards } from '@nestjs/common';
import { ResilienceService } from './resilience/resilience.service';
import { VerifyEligibilityDto } from './eligibility/dto/verify-eligibility.dto';
import { IdempotencyInterceptor } from './common/interceptors/idempotency.interceptor';
import { ThrottlerGuard } from '@nestjs/throttler';
import { ApiKeyGuard } from './common/guards/api-key.guard';

@Controller('eligibility')
@UseGuards(ThrottlerGuard, ApiKeyGuard)
@UseInterceptors(IdempotencyInterceptor)
export class AppController {
    constructor(private readonly resilienceService: ResilienceService) { }

    @Post('verify')
    async handleVerify(@Body() data: VerifyEligibilityDto) {
        return await this.resilienceService.execute(data);
    }
}
