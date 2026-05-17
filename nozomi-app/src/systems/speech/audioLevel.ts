/** RMS from byte time-domain samples (AnalyserNode getByteTimeDomainData). */
export function rmsFromTimeDomain(data: Uint8Array): number {
  if (data.length === 0) return 0
  let sum = 0
  for (let i = 0; i < data.length; i++) {
    const v = (data[i] - 128) / 128
    sum += v * v
  }
  return Math.sqrt(sum / data.length)
}

/** Map RMS to orb/UI level in [0, 1]. */
export function levelFromRms(rms: number, gain = 5): number {
  return Math.min(1, Math.max(0, rms * gain))
}
