import { Injectable, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { IEligibilityService } from '../interfaces/eligibility.interface';

@Injectable()
export class EligibilityService implements IEligibilityService {
    private readonly logger = new Logger(EligibilityService.name);

    async verify(data: any): Promise<any> {
        this.logger.log(`Verifying insurance for: ${data.patient_name}`);

        // Simulate flakiness of clearinghouse APIs
        if (Math.random() < 0.6) {
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
