# PlateLine Cloudflare Worker AI Proxy

This directory contains the Cloudflare Worker serverless function for proxying meal photos to Gemini Vision API.

## Rules
- API keys live ONLY in server-side environment variables (`GEMINI_API_KEY`).
- Worker receives ONLY the meal photo (max 4MB, jpeg/png/webp) after explicit user consent.
- Glucose values and history NEVER leave the device.
- Implemented in Milestone 7.
