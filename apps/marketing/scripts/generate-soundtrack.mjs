import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const sampleRate = 24_000;
const durationSeconds = 24;
const sampleCount = sampleRate * durationSeconds;
const samples = new Float64Array(sampleCount);
const twoPi = Math.PI * 2;

const note = (semitonesFromA4) => 440 * 2 ** (semitonesFromA4 / 12);
const progression = [
  [note(-19), note(-12), note(-7)],
  [note(-23), note(-16), note(-11)],
  [note(-16), note(-9), note(-4)],
  [note(-21), note(-14), note(-9)],
];
const sceneStarts = [0, 3, 7.5, 12, 16.5, 21];

let randomState = 0x43594245;
const noise = () => {
  randomState = (Math.imul(randomState, 1_664_525) + 1_013_904_223) >>> 0;
  return (randomState / 0xffff_ffff) * 2 - 1;
};

const addTone = ({ start, duration, frequency, gain, attack = 0.01, release = 0.2 }) => {
  const firstSample = Math.max(0, Math.floor(start * sampleRate));
  const lastSample = Math.min(sampleCount, Math.ceil((start + duration) * sampleRate));

  for (let index = firstSample; index < lastSample; index += 1) {
    const localTime = index / sampleRate - start;
    const attackEnvelope = Math.min(1, localTime / attack);
    const releaseEnvelope = Math.min(1, (duration - localTime) / release);
    const envelope = Math.max(0, Math.min(attackEnvelope, releaseEnvelope));
    const fundamental = Math.sin(twoPi * frequency * localTime);
    const harmonic = Math.sin(twoPi * frequency * 2 * localTime) * 0.18;
    samples[index] += (fundamental + harmonic) * gain * envelope;
  }
};

const addSweep = ({ start, duration, from, to, gain }) => {
  const firstSample = Math.max(0, Math.floor(start * sampleRate));
  const lastSample = Math.min(sampleCount, Math.ceil((start + duration) * sampleRate));
  let phase = 0;

  for (let index = firstSample; index < lastSample; index += 1) {
    const progress = (index - firstSample) / Math.max(1, lastSample - firstSample);
    const frequency = from + (to - from) * progress;
    phase += (twoPi * frequency) / sampleRate;
    const envelope = Math.sin(Math.PI * progress) ** 1.6;
    samples[index] += Math.sin(phase) * gain * envelope;
  }
};

const addHat = (start, gain) => {
  const duration = 0.085;
  const firstSample = Math.floor(start * sampleRate);
  const lastSample = Math.min(sampleCount, Math.ceil((start + duration) * sampleRate));
  let previous = 0;

  for (let index = firstSample; index < lastSample; index += 1) {
    const progress = (index - firstSample) / Math.max(1, lastSample - firstSample);
    const current = noise();
    const highPass = current - previous * 0.72;
    previous = current;
    samples[index] += highPass * gain * (1 - progress) ** 4;
  }
};

for (let section = 0; section < 8; section += 1) {
  const start = section * 3;
  const chord = progression[section % progression.length];

  chord.forEach((frequency, index) => {
    addTone({
      start,
      duration: 3.05,
      frequency,
      gain: index === 0 ? 0.095 : 0.055,
      attack: 0.45,
      release: 0.75,
    });
  });
}

const beatSeconds = 0.6;
for (let beat = 0; beat * beatSeconds < durationSeconds; beat += 1) {
  const start = beat * beatSeconds;
  const section = Math.floor(start / 3);
  const chord = progression[section % progression.length];
  const arpeggio = chord[(beat + section) % chord.length] * 2;

  addTone({ start, duration: 0.24, frequency: arpeggio, gain: 0.095, release: 0.19 });
  addTone({ start, duration: 0.34, frequency: chord[0] / 2, gain: 0.16, release: 0.27 });
  addHat(start + beatSeconds / 2, beat % 4 === 3 ? 0.055 : 0.035);
}

sceneStarts.forEach((start, index) => {
  addSweep({
    start: Math.max(0, start - 0.045),
    duration: index === 0 || index === sceneStarts.length - 1 ? 0.42 : 0.26,
    from: index === sceneStarts.length - 1 ? 310 : 520,
    to: index === sceneStarts.length - 1 ? 740 : 980,
    gain: index === 0 || index === sceneStarts.length - 1 ? 0.16 : 0.09,
  });
});

let peak = 0;
for (let index = 0; index < samples.length; index += 1) {
  const time = index / sampleRate;
  const fadeIn = Math.min(1, time / 0.65);
  const fadeOut = Math.min(1, (durationSeconds - time) / 0.85);
  samples[index] *= Math.max(0, Math.min(fadeIn, fadeOut));
  peak = Math.max(peak, Math.abs(samples[index]));
}

const normalization = peak > 0 ? 0.82 / peak : 1;
const dataSize = sampleCount * 2;
const wav = Buffer.alloc(44 + dataSize);

wav.write("RIFF", 0);
wav.writeUInt32LE(36 + dataSize, 4);
wav.write("WAVE", 8);
wav.write("fmt ", 12);
wav.writeUInt32LE(16, 16);
wav.writeUInt16LE(1, 20);
wav.writeUInt16LE(1, 22);
wav.writeUInt32LE(sampleRate, 24);
wav.writeUInt32LE(sampleRate * 2, 28);
wav.writeUInt16LE(2, 32);
wav.writeUInt16LE(16, 34);
wav.write("data", 36);
wav.writeUInt32LE(dataSize, 40);

for (let index = 0; index < sampleCount; index += 1) {
  const value = Math.max(-1, Math.min(1, samples[index] * normalization));
  wav.writeInt16LE(Math.round(value * 32_767), 44 + index * 2);
}

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const outputPath = resolve(scriptDirectory, "../public/audio/cyberlearn-promo.wav");
await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, wav);

console.log(`Generated ${outputPath} (${durationSeconds}s, ${sampleRate}Hz, mono PCM)`);
