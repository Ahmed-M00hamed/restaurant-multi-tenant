// صوت تنبيه الطلبات الجديدة — بيتولّد بالكود (Web Audio) من غير أي ملف صوت.
// المتصفحات بتمنع الصوت لحد ما المستخدم يضغط على الصفحة مرة، عشان كده في unlockAudio.

let audioContext = null

const getContext = () => {
  if (audioContext) return audioContext

  const AudioContextClass =
    window.AudioContext || window.webkitAudioContext

  if (!AudioContextClass) return null

  audioContext = new AudioContextClass()

  return audioContext
}

// بيحاول يفعّل الصوت. بيرجّع true لو الصوت جاهز.
export const unlockAudio = async () => {
  const context = getContext()

  if (!context) return false

  if (context.state !== "running") {
    try {
      await context.resume()
    } catch {
      return false
    }
  }

  return context.state === "running"
}

const playTone = (context, frequency, startAt, duration) => {
  const oscillator = context.createOscillator()
  const gain = context.createGain()

  oscillator.type = "sine"
  oscillator.frequency.value = frequency

  gain.gain.setValueAtTime(0.0001, startAt)
  gain.gain.exponentialRampToValueAtTime(0.5, startAt + 0.02)
  gain.gain.exponentialRampToValueAtTime(0.0001, startAt + duration)

  oscillator.connect(gain)
  gain.connect(context.destination)

  oscillator.start(startAt)
  oscillator.stop(startAt + duration + 0.05)
}

// رنّة "دينج-دونج"؛ repeat = عدد مرات التكرار (المطعم غالبًا زحمة وصوته عالي)
export const playOrderSound = async ({ repeat = 3 } = {}) => {
  const ready = await unlockAudio()

  if (!ready) return false

  const context = getContext()
  const now = context.currentTime

  for (let i = 0; i < repeat; i++) {
    const start = now + i * 1.1

    playTone(context, 880, start, 0.45)
    playTone(context, 1318.5, start + 0.28, 0.6)
  }

  return true
}
