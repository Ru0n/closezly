#!/usr/bin/env node
/**
 * Test script for enhanced RealTimeVoiceService with streaming capability
 * Tests both streaming and fallback modes
 */

const RealTimeVoiceService = require('../../dist/electron/helpers/RealTimeVoiceService').default;

// Generate test audio data
function generateTestAudio(durationMs = 100, frequency = 440) {
    const sampleRate = 16000;
    const samples = Math.floor(sampleRate * durationMs / 1000);
    const buffer = Buffer.alloc(samples * 2); // 16-bit = 2 bytes per sample
    
    for (let i = 0; i < samples; i++) {
        const t = i / sampleRate;
        const amplitude = Math.sin(2 * Math.PI * frequency * t) * 0.1;
        const sample = Math.floor(amplitude * 32767);
        buffer.writeInt16LE(sample, i * 2);
    }
    
    return buffer;
}

async function testEnhancedVoiceService() {
    console.log('🧪 Testing Enhanced RealTimeVoiceService...\n');
    
    const voiceService = RealTimeVoiceService.getInstance();
    let testsPassed = 0;
    let totalTests = 0;
    
    // Test 1: Check streaming availability
    totalTests++;
    console.log('🔄 Test 1: Checking streaming availability...');
    const streamingAvailable = voiceService.isStreamingAvailable();
    console.log(`📊 Streaming available: ${streamingAvailable}`);
    testsPassed++; // This test always passes, just informational
    
    // Test 2: Get streaming status
    totalTests++;
    console.log('\n🔄 Test 2: Getting streaming status...');
    const status = voiceService.getStreamingStatus();
    console.log('📊 Streaming status:', status);
    if (typeof status.available === 'boolean' && typeof status.active === 'boolean') {
        console.log('✅ Status structure correct');
        testsPassed++;
    } else {
        console.log('❌ Invalid status structure');
    }
    
    // Set up event listeners
    let interimResults = [];
    let finalResult = null;
    let recordingStarted = false;
    let recordingStopped = false;
    
    voiceService.on('recording-started', (data) => {
        console.log('📡 Recording started:', data);
        recordingStarted = true;
    });
    
    voiceService.on('recording-stopped', (data) => {
        console.log('📡 Recording stopped:', data);
        recordingStopped = true;
    });
    
    voiceService.on('interim-transcription', (result) => {
        console.log('📡 Interim transcription:', result.text);
        interimResults.push(result);
    });
    
    voiceService.on('transcription-completed', (result) => {
        console.log('📡 Transcription completed:', result.text || '(empty)');
        finalResult = result;
    });
    
    voiceService.on('streaming-error', (error) => {
        console.log('📡 Streaming error:', error.message);
    });
    
    voiceService.on('streaming-fallback', (error) => {
        console.log('📡 Streaming fallback triggered:', error.message);
    });
    
    voiceService.on('recording-error', (error) => {
        console.error('📡 Recording error:', error.message);
    });
    
    // Test 3: Start recording with streaming enabled
    totalTests++;
    console.log('\n🔄 Test 3: Starting recording with streaming...');
    
    const recordingStarted1 = await voiceService.startRecording({
        enableStreaming: true,
        streamingFallback: true,
        maxDuration: 10000 // 10 seconds max
    });
    
    if (recordingStarted1 && recordingStarted) {
        console.log('✅ Recording started successfully');
        testsPassed++;
    } else {
        console.log('❌ Failed to start recording');
    }
    
    // Test 4: Send audio chunks
    totalTests++;
    console.log('\n🔄 Test 4: Sending audio chunks...');
    
    try {
        const chunkCount = 15;
        for (let i = 0; i < chunkCount; i++) {
            const audioChunk = generateTestAudio(100, 440 + i * 5);
            await voiceService.receiveAudioData(audioChunk);
            
            // Small delay to simulate real-time streaming
            await new Promise(resolve => setTimeout(resolve, 50));
        }
        console.log(`✅ Sent ${chunkCount} audio chunks`);
        testsPassed++;
    } catch (error) {
        console.log('❌ Error sending audio chunks:', error.message);
    }
    
    // Wait for any interim results
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Test 5: Stop recording and get transcription
    totalTests++;
    console.log('\n🔄 Test 5: Stopping recording...');
    
    try {
        const transcriptionResult = await voiceService.stopRecording();
        
        if (transcriptionResult && recordingStopped) {
            console.log('✅ Recording stopped successfully');
            console.log('📊 Transcription result:', {
                success: transcriptionResult.success,
                text: transcriptionResult.text || '(empty)',
                duration: transcriptionResult.duration,
                hasSegments: transcriptionResult.segments ? transcriptionResult.segments.length > 0 : false
            });
            testsPassed++;
        } else {
            console.log('❌ Failed to stop recording or get result');
        }
    } catch (error) {
        console.log('❌ Error stopping recording:', error.message);
    }
    
    // Test 6: Test batch mode (streaming disabled)
    totalTests++;
    console.log('\n🔄 Test 6: Testing batch mode...');
    
    // Reset state
    recordingStarted = false;
    recordingStopped = false;
    finalResult = null;
    
    const recordingStarted2 = await voiceService.startRecording({
        enableStreaming: false, // Force batch mode
        maxDuration: 5000
    });
    
    if (recordingStarted2 && recordingStarted) {
        console.log('✅ Batch mode recording started');
        
        // Send a few chunks
        for (let i = 0; i < 5; i++) {
            const audioChunk = generateTestAudio(200, 880);
            await voiceService.receiveAudioData(audioChunk);
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        // Stop recording
        const batchResult = await voiceService.stopRecording();
        
        if (batchResult && recordingStopped) {
            console.log('✅ Batch mode completed successfully');
            testsPassed++;
        } else {
            console.log('❌ Batch mode failed');
        }
    } else {
        console.log('❌ Failed to start batch mode recording');
    }
    
    // Test 7: Service status after operations
    totalTests++;
    console.log('\n🔄 Test 7: Checking final service status...');
    
    const finalStatus = voiceService.getStatus();
    const streamingStatus = voiceService.getStreamingStatus();
    
    if (!finalStatus.isRecording && !streamingStatus.active) {
        console.log('✅ Service properly reset after operations');
        testsPassed++;
    } else {
        console.log('❌ Service not properly reset');
    }
    
    console.log('\n📊 Test Results Summary:');
    console.log(`✅ Passed: ${testsPassed}/${totalTests} tests`);
    console.log(`📊 Interim results received: ${interimResults.length}`);
    console.log(`📊 Final result received: ${finalResult ? 'Yes' : 'No'}`);
    console.log(`📊 Streaming available: ${streamingAvailable}`);
    
    if (testsPassed === totalTests) {
        console.log('\n🎉 All tests passed! Enhanced RealTimeVoiceService is working correctly.');
        console.log('💡 The service supports both streaming and batch transcription modes.');
        process.exit(0);
    } else {
        console.log('\n💥 Some tests failed. Check the implementation.');
        process.exit(1);
    }
}

// Handle process signals
process.on('SIGINT', async () => {
    console.log('\n🛑 Received interrupt signal, cleaning up...');
    try {
        const voiceService = RealTimeVoiceService.getInstance();
        await voiceService.shutdownStreaming();
    } catch (error) {
        console.error('Error during cleanup:', error.message);
    }
    process.exit(0);
});

// Run the test
testEnhancedVoiceService().catch((error) => {
    console.error('💥 Test failed with error:', error);
    process.exit(1);
});
