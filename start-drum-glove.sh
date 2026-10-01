#!/bin/bash
# =====================================================
# Smart Drum Glove - Full Stack Launcher
# =====================================================

set -e

SOUNDFONT="/usr/share/sounds/sf2/TimGM6mb.sf2"
LOG="/tmp/fluidsynth.log"

echo "=========================================="
echo " Smart Drum Glove - Startup"
echo "=========================================="

# 1. Load VirMIDI module
echo "[1/4] Loading snd-virmidi..."
sudo modprobe snd-virmidi
sleep 1

# 2. Kill old FluidSynth
echo "[2/4] Stopping old FluidSynth..."
pkill -9 fluidsynth 2>/dev/null || true
sleep 1

# 3. Start FluidSynth in background (with no stdin)
echo "[3/4] Starting FluidSynth ($SOUNDFONT)..."
fluidsynth -a alsa -m alsa_seq -i \
    -o audio.alsa.device=default \
    -o midi.alsa_seq.id=FSYNTH \
    -g 2.0 \
    "$SOUNDFONT" < /dev/null > "$LOG" 2>&1 &

sleep 2

# 4. Auto-detect client numbers and route
echo "[4/4] Routing VirMIDI -> FluidSynth..."

VM=$(awk '/"Virtual Raw MIDI 1-0"/{print $2}' /proc/asound/seq/clients | head -1)
FS=$(awk '/"FSYNTH"/{print $2}' /proc/asound/seq/clients | head -1)

if [ -z "$VM" ]; then
    echo "ERROR: VirMIDI client not found. Check: sudo modprobe snd-virmidi"
    exit 1
fi

if [ -z "$FS" ]; then
    echo "ERROR: FluidSynth client not found. See $LOG"
    echo "----- last lines of $LOG -----"
    tail -20 "$LOG"
    exit 1
fi

echo "      VirMIDI client = $VM"
echo "      FluidSynth client = $FS"

aconnect -x 2>/dev/null || true
aconnect ${VM}:0 ${FS}:0

echo ""
echo "=========================================="
echo " Ready!"
echo "=========================================="
echo " Now open a NEW terminal and run:"
echo ""
echo "     cd ~/Desktop/clg-wrk/iot/drum-first"
echo "     source venv/bin/activate"
echo "     python run.py"
echo ""
echo " Then in the app:"
echo "     1. MIDI Refresh -> Open MIDI"
echo "     2. Refresh Ports -> Connect (/dev/ttyUSB0)"
echo "     3. CALIBRATE (hand open, still)"
echo "     4. Suggest Thresholds"
echo "     5. Bend fingers -> drums play!"
echo "=========================================="
