export function scrubPHI(data: any): any {
    if (!data) return data;
    const sensitiveFields = ['patient_name', 'ssn', 'dob', 'address', 'phone'];

    if (typeof data === 'object') {
        const cleaned = { ...data };
        for (const field of sensitiveFields) {
            if (field in cleaned) {
                cleaned[field] = '[REDACTED]';
            }
        }
        return cleaned;
    }
    return data;
}
