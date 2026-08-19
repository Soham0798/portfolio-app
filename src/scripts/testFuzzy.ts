import { fetchAllMutualFunds, searchMutualFund } from '../lib/prices/amfi';

async function run() {
    console.log('Fetching AMFI list...');
    const schemes = await fetchAllMutualFunds();
    console.log(`Loaded ${schemes.length} schemes`);

    const tests = [
        "Parag Parikh Flexi Cap Fund Direct Growth",
        "ICICI Prudential Technology Fund Direct Growth",
        "Bandhan Small Cap Fund Direct Growth",
        "Motilal Oswal Midcap Fund Direct Growth",
        "Motilal Oswal Midcap Fund Regular Growth", // testing regular penalty
    ];

    for (const t of tests) {
        const code = searchMutualFund(t, schemes);
        if (code) {
            const match = schemes.find(s => s.schemeCode.toString() === code);
            console.log(`\nQuery: "${t}"\n -> Match: [${code}] ${match?.schemeName}`);
        } else {
            console.log(`\nQuery: "${t}"\n -> Match: NONE`);
        }
    }
}

run().catch(console.error);
