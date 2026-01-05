import { scrubPHI } from './phi-scrubber';

describe('phi-scrubber', () => {
    it('should redact sensitive fields from an object', () => {
        const data = {
            patient_name: 'John Doe',
            ssn: '123-456-7890',
            dob: '1990-01-01',
            address: '123 Main St',
            phone: '555-1234',
            other: 'not sensitive'
        };

        const result = scrubPHI(data);

        expect(result.patient_name).toBe('[REDACTED]');
        expect(result.ssn).toBe('[REDACTED]');
        expect(result.dob).toBe('[REDACTED]');
        expect(result.address).toBe('[REDACTED]');
        expect(result.phone).toBe('[REDACTED]');
        expect(result.other).toBe('not sensitive');
    });

    it('should return null if data is null', () => {
        expect(scrubPHI(null)).toBeNull();
    });

    it('should return original if data is not an object', () => {
        expect(scrubPHI('string')).toBe('string');
        expect(scrubPHI(123)).toBe(123);
    });

    it('should not mutate the original object', () => {
        const data = { patient_name: 'John Doe' };
        scrubPHI(data);
        expect(data.patient_name).toBe('John Doe');
    });

    it('should redact sensitive fields in nested objects', () => {
        const data = {
            metadata: {
                patient_name: 'John Doe',
                details: {
                    ssn: '123-456-7890'
                }
            },
            status: 'active'
        };

        const result = scrubPHI(data);

        expect(result.metadata.patient_name).toBe('[REDACTED]');
        expect(result.metadata.details.ssn).toBe('[REDACTED]');
        expect(result.status).toBe('active');
    });

    it('should redact sensitive fields in arrays', () => {
        const data = [
            { patient_name: 'John Doe' },
            { patient_name: 'Jane Smith', phone: '555-5555' }
        ];

        const result = scrubPHI(data);

        expect(result[0].patient_name).toBe('[REDACTED]');
        expect(result[1].patient_name).toBe('[REDACTED]');
        expect(result[1].phone).toBe('[REDACTED]');
    });
});
