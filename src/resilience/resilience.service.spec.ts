import { Test, TestingModule } from '@nestjs/testing';
import { ResilienceService } from './resilience.service';
import { IEligibilityService } from '../interfaces/eligibility.interface';
import { SQSService } from '../sqs/sqs.service';
import { ConfigService } from '@nestjs/config';
import { HttpException, HttpStatus } from '@nestjs/common';

describe('ResilienceService', () => {
    let service: ResilienceService;
    let eligibilityService: IEligibilityService;
    let sqsService: SQSService;

    beforeEach(async () => {
        jest.useFakeTimers();
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ResilienceService,
                {
                    provide: 'IEligibilityService',
                    useValue: {
                        verify: jest.fn(),
                    },
                },
                {
                    provide: SQSService,
                    useValue: {
                        pushToRetryQueue: jest.fn(),
                    },
                },
                {
                    provide: ConfigService,
                    useValue: {
                        get: jest.fn().mockImplementation((key) => {
                            if (key === 'CB_TIMEOUT') return 10000;
                            if (key === 'CB_RESET_TIMEOUT') return 1000;
                            if (key === 'CB_ERROR_THRESHOLD') return 50;
                            if (key === 'CB_VOLUME_THRESHOLD') return 10;
                            if (key === 'CB_WINDOW') return 300000; // 300s window
                            return null;
                        }),
                    },
                },
            ],
        }).compile();

        service = module.get<ResilienceService>(ResilienceService);
        eligibilityService = module.get<IEligibilityService>('IEligibilityService');
        sqsService = module.get<SQSService>(SQSService);

        service.onModuleInit();
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    it('should retry 3 times on failure and then fallback', async () => {
        const error = new HttpException('API Error', HttpStatus.INTERNAL_SERVER_ERROR);
        (eligibilityService.verify as jest.Mock).mockRejectedValue(error);

        const promise = service.execute({ patient_name: 'Test' });

        // Fast-forward through retries
        // 1st retry (1s), 2nd (2s), 3rd (4s)
        for (let i = 0; i < 4; i++) {
            await Promise.resolve(); // Flush microtasks
            jest.advanceTimersByTime(10000); // Jump ahead
        }

        const result: any = await promise;

        expect(eligibilityService.verify).toHaveBeenCalledTimes(4);
        expect(result.status).toBe('QUEUED');
        expect(result.resolution_path).toBe('SPOOL_TO_SQS');
        expect(sqsService.pushToRetryQueue).toHaveBeenCalled();
    });

    it('should return success immediately if call succeeds', async () => {
        const successResult = { status: 'SUCCESS', data: {} };
        (eligibilityService.verify as jest.Mock).mockResolvedValue(successResult);

        const result = await service.execute({ patient_name: 'Test' });

        expect(eligibilityService.verify).toHaveBeenCalledTimes(1);
        expect(result).toEqual(successResult);
    });

    it('should not open circuit before volumeThreshold is reached', async () => {
        const error = new HttpException('API Error', HttpStatus.INTERNAL_SERVER_ERROR);
        (eligibilityService.verify as jest.Mock).mockRejectedValue(error);

        // Make 9 calls (threshold is 10)
        for (let i = 0; i < 9; i++) {
            const promise = service.execute({ patient_name: 'Test' });
            // Advanced timer enough to cover retries (10s > 7s)
            await Promise.resolve();
            jest.advanceTimersByTime(10000);
            await promise;
        }

        expect(service['breaker'].opened).toBe(false);

        // 10th call should trip it
        const promise = service.execute({ patient_name: 'Test' });
        await Promise.resolve();
        jest.advanceTimersByTime(10000);
        await promise;

        expect(service['breaker'].opened).toBe(true);
    });
});
