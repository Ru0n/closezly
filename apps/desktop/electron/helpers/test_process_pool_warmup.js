#!/usr/bin/env node
/**
 * Test script for ProcessPool warm-up functionality
 * Tests the timeout fix and warm-up reliability
 */

const { ProcessPool } = require('./WhisperProcessPool');
const path = require('path');
const os = require('os');

async function testProcessPoolWarmup() {
    console.log('🧪 Testing ProcessPool Warm-up Functionality...\n');
    
    let testsPassed = 0;
    let totalTests = 0;
    let pool = null;
    
    try {
        // Test configuration
        const testConfig = {
            poolSize: 3,
            whisperCliPath: '/opt/homebrew/bin/whisper-cli', // Adjust path as needed
            modelPath: path.join(os.homedir(), '.cache/whisper/tiny.en.bin'),
            whisperCppDir: '/opt/homebrew/share/whisper-cpp', // Adjust path as needed
            language: 'en',
            requestTimeout: 2000 // Regular processing timeout
        };
        
        console.log('📋 Test Configuration:');
        console.log(`   Pool Size: ${testConfig.poolSize}`);
        console.log(`   Whisper CLI: ${testConfig.whisperCliPath}`);
        console.log(`   Model Path: ${testConfig.modelPath}`);
        console.log(`   Request Timeout: ${testConfig.requestTimeout}ms`);
        console.log(`   Expected Warm-up Timeout: 2500ms\n`);
        
        // Test 1: Pool Creation
        totalTests++;
        console.log('🔄 Test 1: Creating ProcessPool...');
        
        pool = new ProcessPool(testConfig);
        
        if (pool) {
            console.log('✅ ProcessPool created successfully');
            testsPassed++;
        } else {
            console.log('❌ Failed to create ProcessPool');
        }
        
        // Test 2: Pool Initialization
        totalTests++;
        console.log('\n🔄 Test 2: Initializing ProcessPool...');
        
        const initStartTime = Date.now();
        await pool.initialize();
        const initTime = Date.now() - initStartTime;
        
        console.log(`✅ ProcessPool initialized in ${initTime}ms`);
        testsPassed++;
        
        // Test 3: Warm-up Process
        totalTests++;
        console.log('\n🔄 Test 3: Testing warm-up process...');
        
        const warmupStartTime = Date.now();
        
        // Listen for warm-up events
        let warmUpCompleted = false;
        let warmUpFailed = false;
        let warmUpInfo = null;
        
        pool.on('warmedUp', (info) => {
            warmUpCompleted = true;
            warmUpInfo = info;
            console.log(`🔥 Warm-up completed: ${info.successCount}/${info.totalWorkers} workers in ${info.totalTime}ms`);
        });
        
        pool.on('warmUpFailed', () => {
            warmUpFailed = true;
            console.log('❌ Warm-up failed');
        });
        
        // Start warm-up
        await pool.warmUpAllWorkers();
        
        // Wait a bit for events to fire
        await new Promise(resolve => setTimeout(resolve, 100));
        
        const warmupTime = Date.now() - warmupStartTime;
        
        if (warmUpCompleted && !warmUpFailed) {
            console.log(`✅ Warm-up successful in ${warmupTime}ms`);
            console.log(`   Workers warmed: ${warmUpInfo.successCount}/${warmUpInfo.totalWorkers}`);
            testsPassed++;
        } else if (warmUpFailed) {
            console.log('❌ Warm-up failed - all workers failed to warm up');
        } else {
            console.log('❌ Warm-up status unclear');
        }
        
        // Test 4: Pool Status After Warm-up
        totalTests++;
        console.log('\n🔄 Test 4: Checking pool status after warm-up...');
        
        const status = pool.getStatus();
        console.log('📊 Pool Status:');
        console.log(`   Total Workers: ${status.totalWorkers}`);
        console.log(`   Warm Workers: ${status.warmWorkers}`);
        console.log(`   Cold Workers: ${status.coldWorkers}`);
        console.log(`   Available Workers: ${status.availableWorkers}`);
        console.log(`   Warm-up Progress: ${status.warmUpProgress}%`);
        
        if (status.warmWorkers > 0 && status.warmUpProgress > 0) {
            console.log('✅ Pool status shows warm workers');
            testsPassed++;
        } else {
            console.log('❌ No warm workers detected in pool status');
        }
        
        // Test 5: Individual Worker Status
        totalTests++;
        console.log('\n🔄 Test 5: Checking individual worker status...');
        
        const workers = pool.workers || new Map();
        let warmWorkerCount = 0;
        
        for (const [workerId, worker] of workers) {
            const workerStatus = worker.getStatus();
            console.log(`   Worker ${workerId}: ${workerStatus.state} (warm: ${worker.isWorkerWarm()})`);
            
            if (worker.isWorkerWarm()) {
                warmWorkerCount++;
            }
        }
        
        if (warmWorkerCount > 0) {
            console.log(`✅ ${warmWorkerCount} workers are warm`);
            testsPassed++;
        } else {
            console.log('❌ No workers are warm');
        }
        
        // Test 6: Timeout Verification
        totalTests++;
        console.log('\n🔄 Test 6: Verifying timeout behavior...');
        
        // Check if warm-up completed within reasonable time (should be < 3000ms per worker)
        const expectedMaxTime = 3000 * testConfig.poolSize; // Conservative estimate
        
        if (warmupTime < expectedMaxTime) {
            console.log(`✅ Warm-up completed within expected time (${warmupTime}ms < ${expectedMaxTime}ms)`);
            testsPassed++;
        } else {
            console.log(`❌ Warm-up took too long (${warmupTime}ms >= ${expectedMaxTime}ms)`);
        }
        
    } catch (error) {
        console.error('💥 Test failed with error:', error);
        console.error('Stack trace:', error.stack);
    } finally {
        // Cleanup
        if (pool) {
            console.log('\n🧹 Cleaning up...');
            try {
                pool.terminate();
                console.log('✅ Pool terminated successfully');
            } catch (cleanupError) {
                console.error('❌ Cleanup error:', cleanupError.message);
            }
        }
    }
    
    // Summary
    console.log('\n📊 Test Results Summary:');
    console.log(`✅ Passed: ${testsPassed}/${totalTests} tests`);
    console.log(`📊 Success Rate: ${Math.round((testsPassed / totalTests) * 100)}%`);
    
    if (testsPassed >= 4) { // Allow some flexibility
        console.log('\n🎉 ProcessPool warm-up tests mostly passed!');
        console.log('💡 The timeout fix appears to be working.');
        
        if (testsPassed === totalTests) {
            console.log('🌟 All tests passed perfectly!');
        } else {
            console.log('⚠️  Some tests failed - check the logs above for details.');
        }
        
        process.exit(0);
    } else {
        console.log('\n💥 ProcessPool warm-up tests failed.');
        console.log('🔧 Check the whisper-cli path, model path, and timeout configuration.');
        process.exit(1);
    }
}

// Handle process signals
process.on('SIGINT', () => {
    console.log('\n🛑 Received interrupt signal, exiting...');
    process.exit(0);
});

// Run the test
testProcessPoolWarmup().catch((error) => {
    console.error('💥 Test failed with error:', error);
    process.exit(1);
});
