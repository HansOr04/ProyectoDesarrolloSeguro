// Script para verificar endpoints de la API
// Ejecutar en la consola del navegador después de iniciar sesión

const API_BASE = 'http://localhost:3000/api';

// Obtener token del localStorage
const token = localStorage.getItem('token');

if (!token) {
    console.error('❌ No hay token. Por favor inicia sesión primero.');
} else {
    console.log('✅ Token encontrado, iniciando verificación de endpoints...\n');
}

const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
};

const results = {
    endpoints: [],
    errors: []
};

async function testEndpoint(name, method, url, body = null) {
    console.log(`\n🔍 Probando: ${name}`);
    console.log(`   ${method} ${url}`);

    try {
        const options = {
            method,
            headers,
            ...(body && { body: JSON.stringify(body) })
        };

        const response = await fetch(url, options);
        const data = await response.json();

        const result = {
            name,
            method,
            url,
            status: response.status,
            success: response.ok,
            dataType: Array.isArray(data) ? 'array' : typeof data,
            isArray: Array.isArray(data),
            hasItems: data?.items !== undefined,
            hasPagination: data?.totalPages !== undefined || data?.page !== undefined,
            structure: {
                keys: Object.keys(data || {}),
                firstItem: Array.isArray(data) ? data[0] : (data?.items?.[0] || null)
            },
            sample: data
        };

        results.endpoints.push(result);

        console.log(`   ✅ Status: ${response.status}`);
        console.log(`   📦 Tipo: ${result.dataType}`);
        console.log(`   🔑 Keys:`, result.structure.keys);
        if (result.firstItem) {
            console.log(`   📄 Primer item:`, result.structure.firstItem);
        }

        return result;
    } catch (error) {
        console.error(`   ❌ Error:`, error.message);
        results.errors.push({ name, error: error.message });
        return null;
    }
}

async function runTests() {
    console.log('═══════════════════════════════════════════════════');
    console.log('🚀 VERIFICACIÓN DE ENDPOINTS - MONETIX API');
    console.log('═══════════════════════════════════════════════════\n');

    // 1. TRANSACTIONS
    console.log('\n📊 === TRANSACTIONS ===');
    await testEndpoint('Get All Transactions', 'GET', `${API_BASE}/transactions`);
    await testEndpoint('Get Transactions with Pagination', 'GET', `${API_BASE}/transactions?page=1&limit=5`);
    await testEndpoint('Get Transaction Statistics', 'GET', `${API_BASE}/transactions/statistics`);

    // 2. CATEGORIES
    console.log('\n🏷️  === CATEGORIES ===');
    await testEndpoint('Get All Categories', 'GET', `${API_BASE}/categories`);
    await testEndpoint('Get Category Stats', 'GET', `${API_BASE}/categories/stats`);

    // 3. GOALS
    console.log('\n🎯 === GOALS ===');
    await testEndpoint('Get All Goals', 'GET', `${API_BASE}/goals`);

    // 4. PREDICTIONS
    console.log('\n🔮 === PREDICTIONS ===');
    await testEndpoint('Get All Predictions', 'GET', `${API_BASE}/predictions`);
    await testEndpoint('Get Predictions with Limit', 'GET', `${API_BASE}/predictions?limit=5`);
    await testEndpoint('Get Insights', 'GET', `${API_BASE}/predictions/insights`);

    // 5. COMPARISONS
    console.log('\n📈 === COMPARISONS ===');
    await testEndpoint('Get Category Comparisons', 'GET', `${API_BASE}/comparisons/category`);
    await testEndpoint('Get Temporal Comparisons', 'GET', `${API_BASE}/comparisons/temporal`);

    // 6. ALERTS
    console.log('\n🔔 === ALERTS ===');
    await testEndpoint('Get All Alerts', 'GET', `${API_BASE}/alerts`);

    // RESUMEN FINAL
    console.log('\n\n═══════════════════════════════════════════════════');
    console.log('📋 RESUMEN DE VERIFICACIÓN');
    console.log('═══════════════════════════════════════════════════\n');

    const successful = results.endpoints.filter(e => e.success).length;
    const failed = results.endpoints.length - successful;

    console.log(`✅ Exitosos: ${successful}`);
    console.log(`❌ Fallidos: ${failed}`);
    console.log(`⚠️  Errores: ${results.errors.length}\n`);

    // Análisis de estructuras
    console.log('📊 ANÁLISIS DE ESTRUCTURAS:\n');

    const arrayResponses = results.endpoints.filter(e => e.isArray);
    const objectWithItems = results.endpoints.filter(e => e.hasItems);
    const withPagination = results.endpoints.filter(e => e.hasPagination);

    console.log(`Arrays directos: ${arrayResponses.length}`);
    arrayResponses.forEach(e => console.log(`  - ${e.name}`));

    console.log(`\nObjetos con 'items': ${objectWithItems.length}`);
    objectWithItems.forEach(e => console.log(`  - ${e.name}`));

    console.log(`\nCon paginación: ${withPagination.length}`);
    withPagination.forEach(e => console.log(`  - ${e.name}`));

    // Guardar resultados
    console.log('\n\n💾 Resultados completos guardados en: window.apiTestResults');
    window.apiTestResults = results;

    console.log('\n📝 Para ver los resultados completos:');
    console.log('   console.log(JSON.stringify(window.apiTestResults, null, 2))');

    console.log('\n✨ Verificación completada!');
}

// Ejecutar pruebas
runTests().catch(error => {
    console.error('❌ Error fatal:', error);
});
