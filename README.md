# Owngoal 🏀

**Personalized Broadcast Composition Engine**

> **"This is content routing, not content discovery."**

Owngoal redefines how sports are watched by generating viewer-specific broadcast semantics. Instead of a generic feed for everyone, Owngoal orchestrates unique camera angles, highlight focuses, and commentary depths based on individual user profiles.

## 💡 The Concept

Traditional broadcasts show the same minute of gameplay to millions of viewers. Owngoal changes this by treating a game as a dataset of semantic moments.

**Example Scenario:**
*   **The "Fun" Watcher**: Sees the Celtics, favorite player Hugo González, kiss cams, crowd antics, and cheerleaders.
*   **The "Serious" Watcher**: Sees the Knicks, Jalen Brunson, coaching tactics, and emotional reactions, skipping the "fluff" entirely.

Both users watch the same game, but the *composition* of the broadcast adapts to their personality.

## ⚙️ Architecture & AI Workflow

This project leverages a **Perception-Reasoning-Orchestration** loop:

### 1. Perception (TwelveLabs)
We use **TwelveLabs** to semantically understand the raw video feed. It acts as the eyes of the system to detect:
*   **Entities**: Players, coaches, mascots, animals.
*   **Events**: Crowd cheers, emotional reactions, tactical timeouts.
*   **Grounding**: Mapping every semantic event to specific timestamps.

### 2. Reasoning (Google Gemini)
**Gemini** acts as the orchestration engine, handling preference reasoning:
*   **Profile Modeling**: Converts user likes/dislikes into embeddings.
*   **Decision Making**: Decides which shots to include or skip (e.g., *"User hates kiss cam -> SKIP"*).
*   **Adaptive Commentary**: Explains *why* something is happening based on user knowledge level (Beginner vs. Advanced).

### 3. Delivery
A full-stack TypeScript application delivers the composed video stream to the user.

## 🛠️ Tech Stack

*   **Frontend**: TypeScript (React/Next.js)
*   **Backend**: TypeScript (Node.js)
*   **Video Processing**: Python
*   **AI Models**: TwelveLabs (Video Understanding), Google Gemini (Reasoning & Orchestration)
*   **Tools**: FFmpeg (Video Manipulation)

## 📂 Project Structure

```bash
owngoal/
├── backend/                  # Server-side application (TypeScript)
├── frontend/                 # Client-side interface (TypeScript)
├── video_processing_scripts/ # Python scripts for AI analysis and cutting
├── raw_footage/              # Input directory for raw game videos
├── processed_video_clips/    # Output directory for personalized clips
├── testvid/                  # Test assets
└── .gitignore