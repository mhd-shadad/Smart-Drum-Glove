# ============================================================
#  Drum Glove Receiver — UDP + Drum Sounds
# ============================================================
import socket
import pygame
import numpy as np
import sys

# ---------------- CONFIG ----------------
UDP_PORT = 5005
SAMPLE_RATE = 44100

# Flex thresholds (from your calibration)
# Finger fires when value crosses below threshold
FOLD_THRESHOLD = {
    'f1': 20,    # Index → KICK
    'f2': 122,   # Middle → SNARE
    'f3': 88,    # Ring → HAT
    'f4': 26,    # Pinky → TOM
}
RESET_MARGIN = 15
COOLDOWN_MS = 200

# Strike detection
STRIKE_THRESHOLD = 2.0    # g magnitude
STRIKE_COOLDOWN_MS = 100

# ---------------- SYNTHESIZED DRUMS ----------------
def make_kick():
    t = np.linspace(0, 0.5, int(SAMPLE_RATE * 0.5), False)
    freq = 150 * np.exp(-t * 25) + 45
    wave = np.sin(2 * np.pi * freq * t) * np.exp(-t * 8)
    return np.int16(np.clip(wave, -1, 1) * 30000)

def make_snare():
    t = np.linspace(0, 0.25, int(SAMPLE_RATE * 0.25), False)
    noise = np.random.uniform(-1, 1, len(t))
    tone = np.sin(2 * np.pi * 180 * t) + 0.5 * np.sin(2 * np.pi * 330 * t)
    wave = (noise * 0.7 + tone * 0.3) * np.exp(-t * 18)
    return np.int16(np.clip(wave, -1, 1) * 22000)

def make_hat():
    t = np.linspace(0, 0.08, int(SAMPLE_RATE * 0.08), False)
    noise = np.random.uniform(-1, 1, len(t))
    wave = noise * np.exp(-t * 80)
    return np.int16(np.clip(wave, -1, 1) * 12000)

def make_tom():
    t = np.linspace(0, 0.35, int(SAMPLE_RATE * 0.35), False)
    freq = 220 * np.exp(-t * 8) + 80
    wave = np.sin(2 * np.pi * freq * t) * np.exp(-t * 6)
    noise = np.random.uniform(-1, 1, len(t)) * np.exp(-t * 40)
    wave = wave * 0.85 + noise * 0.15
    return np.int16(np.clip(wave, -1, 1) * 25000)

# ---------------- AUDIO ----------------
pygame.mixer.pre_init(SAMPLE_RATE, -16, 2, 512)
pygame.mixer.init()
pygame.mixer.set_num_channels(16)

def to_sound(arr):
    stereo = np.column_stack([arr, arr])
    return pygame.sndarray.make_sound(np.ascontiguousarray(stereo))

sounds = {
    'f1': to_sound(make_kick()),
    'f2': to_sound(make_snare()),
    'f3': to_sound(make_hat()),
    'f4': to_sound(make_tom()),
}
print("🎵 Drums ready: KICK, SNARE, HAT, TOM")

# ---------------- UDP ----------------
sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
sock.bind(("0.0.0.0", UDP_PORT))
sock.settimeout(0.1)
print(f"📡 Listening on UDP {UDP_PORT}")
print("🥁 Ready. Fold finger + strike.\n")

# ---------------- STATE ----------------
armed = {'f1': True, 'f2': True, 'f3': True, 'f4': True}
last_trigger = {'f1': 0, 'f2': 0, 'f3': 0, 'f4': 0}
last_strike = 0
import time

# ---------------- MAIN ----------------
try:
    while True:
        try:
            data, addr = sock.recvfrom(1024)
        except socket.timeout:
            continue

        line = data.decode("utf-8", errors="ignore").strip()
        if not line or line.startswith("HAND"):
            continue

        parts = line.split(",")
        if len(parts) != 11 or parts[0] not in ("L", "R"):
            continue

        try:
            f1, f2, f3, f4 = int(parts[1]), int(parts[2]), int(parts[3]), int(parts[4])
            ax, ay, az = float(parts[5]), float(parts[6]), float(parts[7])
        except ValueError:
            continue

        now_ms = time.time() * 1000

        # Compute strike magnitude
        mag = (ax*ax + ay*ay + az*az) ** 0.5
        strike = mag > STRIKE_THRESHOLD and (now_ms - last_strike > STRIKE_COOLDOWN_MS)
        if strike:
            last_strike = now_ms

        flex_values = {'f1': f1, 'f2': f2, 'f3': f3, 'f4': f4}

        for fkey, val in flex_values.items():
            # Rearm
            if val > FOLD_THRESHOLD[fkey] + RESET_MARGIN:
                armed[fkey] = True

            # Fire
            if armed[fkey] and val < FOLD_THRESHOLD[fkey]:
                if now_ms - last_trigger[fkey] > COOLDOWN_MS:
                    # If IMU available, require strike
                    if mag > 0 and not strike:
                        continue   # waiting for strike

                    ch = pygame.mixer.find_channel(True)
                    if ch:
                        ch.play(sounds[fkey])
                    print(f"🥁 {fkey}  val={val}  mag={mag:.2f}")
                    last_trigger[fkey] = now_ms
                    armed[fkey] = False

except KeyboardInterrupt:
    print("\n👋 Stopped.")
    sock.close()
    pygame.mixer.quit()
