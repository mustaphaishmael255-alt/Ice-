/**
 * Supabase Connectivity Diagnostic Tool
 * 
 * Paste this entire script into your Browser Console (F12) 
 * while on the login page to diagnose connection issues.
 */

(async function diagnoseSupabase() {
    console.log("%c 🍦 Yah! Supabase Diagnostic Tool Starting...", "color: #d91656; font-size: 16px; font-weight: bold;");
    
    const SUPABASE_URL = 'https://vxmvyrdmnufcdlizxuqc.supabase.co';
    const endpoints = [
        { name: "Root API", url: SUPABASE_URL },
        { name: "Auth Endpoint", url: `${SUPABASE_URL}/auth/v1/health` },
        { name: "REST Endpoint", url: `${SUPABASE_URL}/rest/v1/` },
    ];

    for (const ep of endpoints) {
        console.log(`Checking ${ep.name}...`);
        try {
            const start = Date.now();
            const res = await fetch(ep.url, { method: 'GET', mode: 'no-cors' });
            const duration = Date.now() - start;
            console.log(`%c ✅ ${ep.name} reachable (${duration}ms)`, "color: green;");
        } catch (err) {
            console.error(`%c ❌ ${ep.name} UNREACHABLE: ${err.message}`, "color: red; font-weight: bold;");
            if (err.message === "Failed to fetch") {
                console.warn("Possible causes:\n1. Ad-blocker blocking 'supabase.co'\n2. Network firewall\n3. DNS issues");
            }
        }
    }

    console.log("%c Diagnostic Complete.", "font-weight: bold;");
    console.log("If everything is red, check your internet and ad-blocker.");
    console.log("If everything is green but login still fails, check your credentials.");
})();
