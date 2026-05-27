#!/usr/bin/env python3
import math
import random
import wave

import numpy as np


SAMPLE_RATE = 44100
DURATION = 48.0
FRAMES = int(SAMPLE_RATE * DURATION)
OUT = "ambient_ethereal_wind_loop.wav"
SEED = 20260527


def sine(cycles, t, phase=0.0):
    return np.sin((2.0 * np.pi * cycles * t) + phase)


def make_partials(rng, count, low_cycles, high_cycles, amp_low, amp_high):
    return [
        (
            rng.randint(low_cycles, high_cycles),
            rng.uniform(amp_low, amp_high),
            rng.uniform(0.0, 2.0 * math.pi),
        )
        for _ in range(count)
    ]


def harmonic_cloud(t, partials):
    value = np.zeros_like(t)
    for cycles, amp, phase in partials:
        value += amp * sine(cycles, t, phase)
    return value


def render():
    rng = random.Random(SEED)
    loop_pos = np.arange(FRAMES, dtype=np.float64) / FRAMES

    wind_l = make_partials(rng, 24, 3, 140, 0.003, 0.018)
    wind_r = make_partials(rng, 24, 3, 140, 0.003, 0.018)
    shimmer_l = make_partials(rng, 16, 96, 560, 0.0009, 0.0034)
    shimmer_r = make_partials(rng, 16, 96, 560, 0.0009, 0.0034)

    left = 0.36 * harmonic_cloud(loop_pos, wind_l)
    right = 0.36 * harmonic_cloud(loop_pos, wind_r)
    left += 0.42 * harmonic_cloud(loop_pos, shimmer_l)
    right += 0.42 * harmonic_cloud(loop_pos, shimmer_r)

    slow_swell = 0.60 + 0.28 * sine(2, loop_pos, 0.4) + 0.12 * sine(5, loop_pos, 2.1)

    # Suspended D lydian color. Whole loop-cycle counts make the loop seamless.
    drones = [
        (3524, 0.13, 0.0),
        (5280, 0.08, 1.7),
        (7048, 0.07, 2.8),
        (10560, 0.045, 0.6),
        (17760, 0.025, 2.2),
        (23706, 0.018, 4.5),
    ]
    for cycles, amp, phase in drones:
        drift = 0.026 * sine(4, loop_pos, phase + 0.9) + 0.012 * sine(7, loop_pos, phase)
        carrier = np.sin((2.0 * np.pi * cycles * loop_pos) + phase + drift)
        upper = np.sin((2.0 * np.pi * cycles * 2 * loop_pos) + (phase * 0.7) + (drift * 0.5))
        pan = sine(1, loop_pos, phase)
        voice = amp * slow_swell * (carrier + 0.22 * upper)
        left += voice * (0.82 - 0.16 * pan)
        right += voice * (0.82 + 0.16 * pan)

    bells = [
        (14096, 0.030, 0.25, 8),
        (17760, 0.026, 0.53, 5),
        (21120, 0.020, 0.77, 7),
        (31644, 0.015, 0.39, 9),
    ]
    for cycles, amp, phase, repeats in bells:
        pulse = (0.5 + 0.5 * sine(repeats, loop_pos, phase)) ** 18
        overtone = np.sin((2.0 * np.pi * cycles * 2 * loop_pos) + phase)
        tone = np.sin((2.0 * np.pi * cycles * loop_pos) + phase) + 0.32 * overtone
        pan = sine((repeats // 2) + 1, loop_pos, phase + 1.2)
        voice = amp * pulse * tone
        left += voice * (0.8 - 0.25 * pan)
        right += voice * (0.8 + 0.25 * pan)

    stereo = np.column_stack([left, right])
    stereo = np.tanh(1.45 * stereo) / math.tanh(1.45)
    peak = np.max(np.abs(stereo))
    if peak > 0:
        stereo *= 0.88 / peak
    pcm = np.clip(stereo * 32767.0, -32768, 32767).astype("<i2")

    with wave.open(OUT, "wb") as wav:
        wav.setnchannels(2)
        wav.setsampwidth(2)
        wav.setframerate(SAMPLE_RATE)
        wav.writeframes(pcm.tobytes())


if __name__ == "__main__":
    render()
