import autocannon = require('autocannon');

function runStressTest() {
    console.log('--- Starting Production Stress Test (Autocannon) ---');
    console.log('Target: http://localhost:3000/eligibility/verify');
    console.log('Config: 100 connections, 10s duration');

    const instance = autocannon({
        url: 'http://localhost:3000/eligibility/verify',
        connections: 100,
        duration: 10,
        method: 'POST',
        headers: {
            'content-type': 'application/json',
            'x-api-key': 'dev-key-123',
            'x-idempotency-key': 'stress-test-fixed-key'
        },
        body: JSON.stringify({
            patient_name: 'Stress Test Patient',
            payer_id: 'PAYER_STRESS',
            batch_id: 'stress_001'
        })
    }, (err, result) => {
        if (err) {
            console.error('Stress Test Error:', err);
            return;
        }
        console.log('\n--- Stress Test Results ---');
        console.log(`Requests/sec: ${result.requests.average}`);
        console.log(`Latency (ms) Average: ${result.latency.average}`);
        console.log(`Total Requests: ${result.requests.total}`);
        console.log(`2xx Responses: ${result['2xx']}`);
        console.log(`Non-2xx Responses: ${result.non2xx}`);

        if (result.non2xx > 0) {
            console.log('Note: Non-2xx responses include 429 (Rate Limited) which is expected under stress.');
        }
    });

    autocannon.track(instance, { renderProgressBar: true });
}

runStressTest();
