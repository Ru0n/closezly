/**
 * audio-processor-worklet.js
 * 
 * AudioWorklet processor for handling real-time audio processing.
 * Replaces the deprecated ScriptProcessorNode with modern AudioWorkletNode.
 */

class AudioProcessorWorklet extends AudioWorkletProcessor {
  constructor(options) {
    super()
    
    // Initialize processor state
    this.bufferSize = options.processorOptions?.bufferSize || 4096
    this.sampleRate = options.processorOptions?.sampleRate || 16000
    this.channels = options.processorOptions?.channels || 1
    this.source = options.processorOptions?.source || 'microphone'
    
    // Buffer for accumulating samples
    this.buffer = new Float32Array(this.bufferSize)
    this.bufferIndex = 0
    
    console.log(`[AudioWorklet] Initialized for ${this.source} with buffer size ${this.bufferSize}`)
  }

  process(inputs, outputs, parameters) {
    const input = inputs[0]
    const output = outputs[0]
    
    // If no input, return true to keep processor alive
    if (!input || input.length === 0) {
      return true
    }
    
    const inputChannel = input[0]
    if (!inputChannel || inputChannel.length === 0) {
      return true
    }
    
    // Don't copy input to output to avoid audio feedback/echo
    // We only need to process the audio, not play it back
    
    // Accumulate samples in buffer
    for (let i = 0; i < inputChannel.length; i++) {
      this.buffer[this.bufferIndex] = inputChannel[i]
      this.bufferIndex++
      
      // When buffer is full, send it to main thread
      if (this.bufferIndex >= this.bufferSize) {
        this.sendAudioChunk()
        this.bufferIndex = 0
      }
    }
    
    return true
  }
  
  sendAudioChunk() {
    // Convert Float32Array to ArrayBuffer (16-bit samples)
    const buffer = new ArrayBuffer(this.buffer.length * 2)
    const view = new DataView(buffer)
    
    for (let i = 0; i < this.buffer.length; i++) {
      const sample = Math.max(-1, Math.min(1, this.buffer[i]))
      view.setInt16(i * 2, sample * 0x7FFF, true) // little endian
    }
    
    // Send audio chunk to main thread
    this.port.postMessage({
      type: 'audioChunk',
      data: buffer,
      timestamp: currentTime * 1000, // Convert to milliseconds
      source: this.source
    })
  }
}

// Register the processor
registerProcessor('audio-processor-worklet', AudioProcessorWorklet)
