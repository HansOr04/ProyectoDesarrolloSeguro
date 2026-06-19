// Test script to verify API endpoint responses
// Run this in the browser console after logging in

const API_BASE = 'http://localhost:3000/api';

async function testEndpoints() {
    const results = {};

    // Get auth token from localStorage
    const token = localStorage.getItem('token');
    if (!token) {
        console.error('No token found. Please login first.');
        return;
    }

    const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    };

    console.log('🔍 Testing API Endpoints...\n');

    // Test Categories
    try {
        console.log('📁 Testing Categories...');
        const categoriesRes = await fetch(`${API_BASE}/categories`, { headers });
        const categoriesData = await categoriesRes.json();
        results.categories = categoriesData;
        console.log('Categories response:', categoriesData);
        console.log('Is array?', Array.isArray(categoriesData.data));

        const statsRes = await fetch(`${API_BASE}/categories/stats`, { headers });
        const statsData = await statsRes.json();
        results.categoriesStats = statsData;
        console.log('Categories stats response:', statsData);
        console.log('Is array?', Array.isArray(statsData.data));
    } catch (e) {
        console.error('Categories error:', e);
    }

    // Test Transactions
    try {
        console.log('\n💰 Testing Transactions...');
        const txRes = await fetch(`${API_BASE}/transactions?limit=5`, { headers });
        const txData = await txRes.json();
        results.transactions = txData;
        console.log('Transactions response:', txData);
        console.log('Has items?', !!txData.data?.items);
        console.log('Is array?', Array.isArray(txData.data));

        const statsRes = await fetch(`${API_BASE}/transactions/statistics`, { headers });
        const statsData = await statsRes.json();
        results.transactionsStats = statsData;
        console.log('Transactions statistics response:', statsData);
    } catch (e) {
        console.error('Transactions error:', e);
    }

    // Test Goals
    try {
        console.log('\n🎯 Testing Goals...');
        const goalsRes = await fetch(`${API_BASE}/goals`, { headers });
        const goalsData = await goalsRes.json();
        results.goals = goalsData;
        console.log('Goals response:', goalsData);
        console.log('Is array?', Array.isArray(goalsData.data));
    } catch (e) {
        console.error('Goals error:', e);
    }

    // Test Predictions
    try {
        console.log('\n🔮 Testing Predictions...');
        const predRes = await fetch(`${API_BASE}/predictions`, { headers });
        const predData = await predRes.json();
        results.predictions = predData;
        console.log('Predictions response:', predData);
        console.log('Is array?', Array.isArray(predData.data));

        const insightsRes = await fetch(`${API_BASE}/predictions/insights`, { headers });
        const insightsData = await insightsRes.json();
        results.insights = insightsData;
        console.log('Insights response:', insightsData);
    } catch (e) {
        console.error('Predictions error:', e);
    }

    // Test Alerts
    try {
        console.log('\n🔔 Testing Alerts...');
        const alertsRes = await fetch(`${API_BASE}/alerts`, { headers });
        const alertsData = await alertsRes.json();
        results.alerts = alertsData;
        console.log('Alerts response:', alertsData);
        console.log('Is array?', Array.isArray(alertsData.data));

        const countRes = await fetch(`${API_BASE}/alerts/unread-count`, { headers });
        const countData = await countRes.json();
        results.alertsCount = countData;
        console.log('Unread count response:', countData);
    } catch (e) {
        console.error('Alerts error:', e);
    }

    // Test Comparisons
    try {
        console.log('\n📊 Testing Comparisons...');
        const catCompRes = await fetch(`${API_BASE}/comparisons/category`, { headers });
        const catCompData = await catCompRes.json();
        results.comparisonsCategory = catCompData;
        console.log('Comparisons category response:', catCompData);
        console.log('Is array?', Array.isArray(catCompData.data));

        const tempCompRes = await fetch(`${API_BASE}/comparisons/temporal`, { headers });
        const tempCompData = await tempCompRes.json();
        results.comparisonsTemporal = tempCompData;
        console.log('Comparisons temporal response:', tempCompData);
    } catch (e) {
        console.error('Comparisons error:', e);
    }

    console.log('\n✅ Testing complete! Full results:', results);
    console.log('\n📋 Summary:');
    console.log('- Categories: ', Array.isArray(results.categories?.data) ? 'Array' : 'Object/Other');
    console.log('- Categories Stats: ', Array.isArray(results.categoriesStats?.data) ? 'Array' : 'Object/Other');
    console.log('- Transactions: ', results.transactions?.data?.items ? 'Paginated Object' : Array.isArray(results.transactions?.data) ? 'Array' : 'Other');
    console.log('- Goals: ', Array.isArray(results.goals?.data) ? 'Array' : 'Object/Other');
    console.log('- Predictions: ', Array.isArray(results.predictions?.data) ? 'Array' : 'Object/Other');
    console.log('- Alerts: ', Array.isArray(results.alerts?.data) ? 'Array' : 'Object/Other');
    console.log('- Comparisons Category: ', Array.isArray(results.comparisonsCategory?.data) ? 'Array' : 'Object/Other');

    return results;
}

// Run the test
testEndpoints();
