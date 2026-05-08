#!/usr/bin/env bash
# NOT USED — Vercel uses api/requirements.txt directly via @vercel/python.
# This script was written for a Render deployment that is no longer active.
# Kept for reference only.
set -o errexit

pip install -r requirements.txt
