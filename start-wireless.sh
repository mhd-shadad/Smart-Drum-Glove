#!/bin/bash
# Launch the Drum Glove app in WIRELESS mode

cd ~/Desktop/clg-wrk/iot/drum-first
source venv/bin/activate

export DRUM_WIRELESS=1
python run.py
