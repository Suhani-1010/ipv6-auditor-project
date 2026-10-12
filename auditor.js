const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
    // 1. Read the list of websites from sites.txt
    const sites = fs.readFileSync('sites.txt', 'utf8').split('\n').map(s => s.trim()).filter(Boolean);
    
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    
    const csvData = ['Source Site,Status,Transport,IP Address,Dependency URL,Error Message'];
    
    // 2. Loop through each website in the list
    for (const targetUrl of sites) {
        console.log(`\nStarting IPv6 Audit for: ${targetUrl}`);
        console.log(`STATUS     | TRANSPORT  | IP ADDRESS       | URL`);
        console.log(`-------------------------------------------------------------------------`);

        page.removeAllListeners('response');
        page.removeAllListeners('requestfailed');

        page.on('response', async (response) => {
            const url = response.url();
            try {
                const server = await response.serverAddr();
                const status = response.status();
                
                if (server && server.ipAddress) {
                    const isIPv6 = server.ipAddress.includes(':');
                    const transport = isIPv6 ? 'IPv6' : 'IPv4';
                    
                    if (status === 403) {
                        console.log(`[FAILED]   | HTTP Error | ${server.ipAddress.padEnd(16)} | ${url.substring(0, 50)}...`);
                        csvData.push(`"${targetUrl}",FAILED,HTTP Error (${status}),${server.ipAddress},"${url}",`);
                    } else {
                        console.log(`[SUCCESS]  | ${transport.padEnd(10)} | ${server.ipAddress.padEnd(16)} | ${url.substring(0, 50)}...`);
                        csvData.push(`"${targetUrl}",SUCCESS,${transport},${server.ipAddress},"${url}",`);
                    }
                }
            } catch (e) {
                // Ignore dropped connections before IP resolution
            }
        });

        page.on('requestfailed', request => {
            const url = request.url();
            const failure = request.failure();
            const errorText = failure ? failure.errorText : 'Unknown Error';
            
            let errorCategory = "ERROR";
            if (errorText.includes('ERR_NAME_NOT_RESOLVED')) errorCategory = 'DNS Error';
            else if (errorText.includes('ERR_CONNECTION_REFUSED') || errorText.includes('ERR_EMPTY_RESPONSE')) errorCategory = 'TCP Error';
            else if (errorText.includes('ERR_CERT')) errorCategory = 'TLS Error';

            console.log(`[FAILED]   | ${errorCategory.padEnd(10)} | N/A              | ${url.substring(0, 50)}...`);
            csvData.push(`"${targetUrl}",FAILED,${errorCategory},N/A,"${url}","${errorText}"`);
        });

        try {
            await page.goto(targetUrl, { waitUntil: 'networkidle', timeout: 15000 });
        } catch (error) {
            console.log(`[INFO]     | Navigation | Finished or timed out.`);
        }
    }

    fs.writeFileSync('audit_report.csv', csvData.join('\n'));
    console.log('\nAudit Complete for all sites. Results saved to audit_report.csv');
    await browser.close();
})();
