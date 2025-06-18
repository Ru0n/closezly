/**
 * TypeScript definitions for node-record-lpcm16
 * Based on the actual API usage in LocalWhisperService
 */

declare module 'node-record-lpcm16' {
  import { Readable } from 'stream'
  import { ChildProcess } from 'child_process'

  interface RecordingOptions {
    sampleRate?: number
    channels?: number
    compress?: boolean
    threshold?: number
    thresholdStart?: number | null
    thresholdEnd?: number | null
    silence?: string
    verbose?: boolean
    recorder?: string
    endOnSilence?: boolean
    audioType?: string
    device?: string | null
    additionalOptions?: string[]
  }

  interface Recording {
    stream(): Readable
    stop(): void
    pause(): void
    resume(): void
    isPaused(): boolean
    process?: ChildProcess
  }

  export function record(options?: RecordingOptions): Recording
}