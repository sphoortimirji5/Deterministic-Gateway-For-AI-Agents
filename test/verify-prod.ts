import axios from 'axios';

async function runRCMVerification() {
    console.log('--- Starting RCM Eligibility Production Ingestion Test ---');

    // Test Case 1: Idempotency (Same key should return same result)
    console.log('\n[Test 1] Testing Idempotency (Duplicate Request)...');
    const demoKey = `key_${Math.random()}`;
    const req1 = await axios.post('http://localhost:3000/eligibility/verify',
        { patient_name: 'John Doe', payer_id: 'PAYER_1' },
        { headers: { 'x-idempotency-key': demoKey } }
    );
    console.log('Request 1 Status:', req1.data.status);

    const req2 = await axios.post('http://localhost:3000/eligibility/verify',
        { patient_name: 'John Doe', payer_id: 'PAYER_1' },
        { headers: { 'x-idempotency-key': demoKey } }
    );
    console.log('Request 2 Status (Should be identical):', req2.data.status);

    // Test Case 2: PHI Scrubbing (Check logs for redacted patient name)
    console.log('\n[Test 2] Check Terminal Logs for PHI Scrubbing ("patient_name": "[REDACTED]")');

    // Test Case 3: Rate Limiting
    console.log('\n[Test 3] Testing Rate Limiting (Sending 15 requests in 1s, limit is 10)...');
    const rateRequests = Array.from({ length: 15 }, () =>
        axios.post('http://localhost:3000/eligibility/verify',
            { patient_name: 'Rate Test', payer_id: 'PAYER_1' }
        ).catch(err => ({ status: err.response?.status }))
    );

    const rateResults = await Promise.all(rateRequests);
    const tooManyRequests = rateResults.filter(r => r.status === 429).length;
    console.log(`Blocked by Rate Limiter: ${tooManyRequests} requests (expected > 0)`);
}

runRCMVerification();
