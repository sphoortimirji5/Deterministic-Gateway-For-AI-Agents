import axios from 'axios';

async function runRCMVerification() {
    console.log('--- Starting RCM Eligibility High-Throughput Verification (100 Concurrent Requests) ---');

    const requests = Array.from({ length: 100 }, (_, i) => {
        return axios.post('http://localhost:3000/eligibility/verify', {
            patient_name: `Patient_${i + 1}`,
            payer_id: `PAYER_${100 + (i % 5)}`,
            batch_id: 'rcm_morning_batch'
        }, {
            headers: {
                'x-api-key': 'dev-key-123'
            }
        }).then(res => ({ id: i + 1, data: res.data }))
            .catch(err => ({ id: i + 1, error: err.message, status: err.response?.status }));
    });

    const startTime = Date.now();
    const results = await Promise.all(requests);
    const duration = Date.now() - startTime;

    const summary = results.reduce((acc, curr: any) => {
        const status = curr.data?.status || 'ERROR';
        acc[status] = (acc[status] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    console.log('\n--- RCM Simulation Summary ---');
    console.log(`Duration: ${duration}ms`);
    console.log('Ingestion Distribution:', JSON.stringify(summary, null, 2));

    // Sample a few responses
    console.log('\n--- AI Agent Ingestion Responses ---');
    results.slice(0, 5).forEach((r: any) => console.log(`Eligibility Request #${r.id}:`, JSON.stringify(r.data || r.error)));
}

runRCMVerification();
