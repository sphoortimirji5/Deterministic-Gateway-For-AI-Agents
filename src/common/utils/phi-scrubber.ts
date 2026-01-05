export function scrubPHI(data: any): any {
    if (!data) return data;
    const sensitiveFields = ['patient_name', 'ssn', 'dob', 'address', 'phone'];

    if (Array.isArray(data)) {
        return data.map(item => scrubPHI(item));
    }

    if (typeof data === 'object' && data !== null) {
        const cleaned: any = { ...data };
        for (const key in cleaned) {
            if (sensitiveFields.includes(key)) {
                cleaned[key] = '[REDACTED]';
            } else if (typeof cleaned[key] === 'object') {
                cleaned[key] = scrubPHI(cleaned[key]);
            }
        }
        return cleaned;
    }
    return data;
}
