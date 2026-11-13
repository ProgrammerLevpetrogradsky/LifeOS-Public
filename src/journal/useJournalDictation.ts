import { useEffect, useRef, useState } from 'react'

export const dictationLanguages = [
  ['en', 'English'],
  ['ru', 'Русский'],
  ['he', 'עברית'],
] as const

type DictationLanguage = typeof dictationLanguages[number][0]
type DictationStatus = 'idle' | 'starting' | 'listening' | 'preparing' | 'transcribing'

interface Recording {
  language: DictationLanguage
  stream?: MediaStream
  recorder?: MediaRecorder
  timeout?: number
  chunks: Blob[]
}

const sampleRate = 16000
const recordingLimit = 60000
const recorderTypes = ['audio/mp4', 'audio/webm;codecs=opus', 'audio/webm']

function release(recording: Recording) {
  window.clearTimeout(recording.timeout)
  const recorder = recording.recorder
  if (recorder) {
    recorder.onstop = recorder.onerror = recorder.ondataavailable = null
    if (recorder.state !== 'inactive') {
      try {
        recorder.stop()
      } catch {
        // Still release the microphone tracks if the browser already stopped capture.
      }
    }
  }
  recording.stream?.getTracks().forEach(track => track.stop())
}

export function useJournalDictation(onText: (text: string) => void) {
  const active = useRef<Recording | null>(null)
  const engine = useRef<Worker | null>(null)
  const [status, setStatus] = useState<DictationStatus>('idle')
  const [message, setMessage] = useState('')
  const [language, setLanguage] = useState(() => {
    const preferred = navigator.language.split('-')[0]
    return dictationLanguages.find(([code]) => code === preferred)?.[0] ?? 'en'
  })

  useEffect(() => () => {
    const recording = active.current
    active.current = null
    if (recording) release(recording)
    engine.current?.terminate()
    engine.current = null
  }, [])

  function finish(recording: Recording, notice = '') {
    if (active.current !== recording) return
    active.current = null
    release(recording)
    setStatus('idle')
    setMessage(notice)
  }

  function reset() {
    const recording = active.current
    if (recording) {
      engine.current?.terminate()
      engine.current = null
      finish(recording)
    } else {
      setMessage('')
    }
  }

  async function transcribe(recording: Recording) {
    if (active.current !== recording) return
    release(recording)
    setStatus('preparing')
    const failed = () => {
      if (active.current !== recording) return
      engine.current?.terminate()
      engine.current = null
      finish(recording, 'Couldn’t transcribe the recording. Check your connection and try again.')
    }
    recording.timeout = window.setTimeout(failed, 180000)

    try {
      const audio = new Blob(recording.chunks, { type: recording.recorder?.mimeType })
      recording.chunks = []
      if (!audio.size) {
        finish(recording, 'No audio was recorded. Tap the microphone to try again.')
        return
      }

      const decoder = new OfflineAudioContext(1, sampleRate, sampleRate)
      const decoded = await decoder.decodeAudioData(await audio.arrayBuffer())
      if (active.current !== recording) return
      const samples = new Float32Array(decoded.length)
      for (let channel = 0; channel < decoded.numberOfChannels; channel++) {
        const source = decoded.getChannelData(channel)
        for (let i = 0; i < source.length; i++) samples[i] += source[i] / decoded.numberOfChannels
      }
      if (!samples.some(sample => Math.abs(sample) > 0.003)) {
        finish(recording, 'No audio was detected. Check your microphone and try again.')
        return
      }

      const worker = engine.current ?? new Worker(new URL('./journalDictation.worker.ts', import.meta.url), { type: 'module' })
      engine.current = worker
      worker.onerror = failed
      worker.onmessageerror = failed
      worker.onmessage = ({ data }) => {
        if (active.current !== recording) return
        if (data.type === 'transcribing') setStatus('transcribing')
        if (data.type === 'error') failed()
        if (data.type === 'result') {
          if (data.text) onText(data.text)
          finish(recording, data.text ? '' : 'No speech was recognized. Tap the microphone to try again.')
        }
      }
      worker.postMessage({ samples, language: recording.language }, [samples.buffer])
    } catch {
      failed()
    }
  }

  function stop(recording: Recording) {
    window.clearTimeout(recording.timeout)
    setStatus('preparing')
    recording.timeout = window.setTimeout(() => finish(recording, 'Couldn’t finish recording. Try again.'), 4000)
    try {
      recording.recorder?.stop()
    } catch {
      finish(recording, 'Couldn’t finish recording. Try again.')
    }
  }

  async function toggle() {
    const current = active.current
    if (current) {
      if (current.recorder?.state === 'recording') stop(current)
      else reset()
      return
    }

    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder || !window.OfflineAudioContext) {
      setMessage('This browser can’t record audio here. Open LifeOS in Safari or Chrome to dictate.')
      return
    }

    const recording: Recording = { chunks: [], language }
    active.current = recording
    setMessage('')
    setStatus('starting')
    recording.timeout = window.setTimeout(() => finish(recording, 'Microphone access timed out. Tap to try again.'), 20000)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      if (active.current !== recording) {
        stream.getTracks().forEach(track => track.stop())
        return
      }

      recording.stream = stream
      const mimeType = recorderTypes.find(type => MediaRecorder.isTypeSupported(type))
      const recorder = new MediaRecorder(stream, { mimeType, audioBitsPerSecond: 48000 })
      recording.recorder = recorder
      recorder.ondataavailable = event => {
        if (event.data.size) recording.chunks.push(event.data)
      }
      recorder.onstop = () => { void transcribe(recording) }
      recorder.onerror = () => finish(recording, 'The microphone stopped recording. Try again.')
      recorder.start()
      window.clearTimeout(recording.timeout)
      recording.timeout = window.setTimeout(() => stop(recording), recordingLimit)
      setStatus('listening')
    } catch (error) {
      finish(recording, error instanceof DOMException && error.name === 'NotAllowedError'
        ? 'Allow microphone access in your browser to dictate.'
        : 'Couldn’t open the microphone. Check that it’s connected and try again.')
    }
  }

  return { status, message, language, setLanguage, toggle, reset }
}
