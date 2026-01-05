import { Injectable, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { IEligibilityService } from '../interfaces/eligibility.interface';
import { scrubPHI } from '../common/utils/phi-scrubber';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class EligibilityService implements IEligibilityService {
    private readonly logger = new Logger(EligibilityService.name);

    constructor(private readonly configService: ConfigService) { }

    async verify(data: any): Promise<any> {
        const scrubbedData = scrubPHI(data);
        this.logger.log(`Verifying insurance for: ${scrubbedData.patient_name}`);

        const failureRate = this.configService.get<number>('MOCK_FAILURE_RATE') ?? 0.6;

        // Simulate flakiness of clearinghouse APIs
        if (Math.random() < failureRate) {
            this.logger.error('Clearinghouse Timeout / Error');
            throw new HttpException('Clearinghouse API Unavailable', HttpStatus.INTERNAL_SERVER_ERROR);
        }

        return {
            status: 'SUCCESS',
            resolution_path: 'DIRECT',
            data: {
                eligibility_status: 'ACTIVE',
                payer_id: data.payer_id,
                coverage_details: {
                    deductible_remaining: 500.0,
                    copay: 20.0
                },
                verification_id: `ELG_${Math.random().toString(36).substr(2, 9).toUpperCase()}`
            }
        };
    }
}
