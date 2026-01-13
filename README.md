# Owngoal 🏀
[![SB Hacks XII 2026 Winner](https://img.shields.io/badge/SB%20Hacks%20XII%202026-Winner-brightgreen)](https://devpost.com/software/owngoal)

**The Personalized Broadcast Director Agent**

> **"This is content routing, not content discovery."**

Owngoal redefines how sports are watched. We are proposing **personalized broadcast composition**, not just recommendations. With Owngoal, **different viewers watch the same minute of a game but see different shots** tailored specifically to their interests.

Owngoal relieves sports broadcasters from the duty of generating universal stories. Instead, we use AI to act as a real-time director, selecting specific camera angles (4CAM, 2CAM, etc.) based on an individual viewer's persona.

## 💡 Motivation

Millions of people watch the same basketball game, but they look for different things.
*   **The Fanatic:** Wants to see their favorite player's face and emotional reactions.
*   **The Tactician:** Wants wide angles to analyze court spacing and off-ball movement.
*   **The Casual Viewer:** Wants viral moments, kiss cams, and crowd energy.

Social platforms like TikTok and Instagram already build user personas to route content. **Owngoal applies this logic to the live camera feed of a sports game.**

## ⚙️ How It Works

We built a recommendation system that acts like a real-time director using Foundation Models and mathematical mapping.

### 1. Visual Perception (TwelveLabs)
We don't just tag videos; we align them mathematically. We feed the raw footage from multiple camera angles (4CAM, 2CAM, 5CAM, 11CAM, BREP) into **TwelveLabs Marengo**. This generates video embeddings for every moment of the game, creating a semantic understanding of the visual feed.

### 2. User Persona (Google Gemini)
We use **Google Gemini** to process natural language descriptions of the user (e.g., "I love high-intensity defense and crowd reactions") and generate **User Embeddings**. This maps the user's abstract preferences into the same vector space as the video.

### 3. The Director Agent (Cosine Similarity)
As the game progresses, our Agent calculates the **Cosine Similarity** between the *User Persona Embedding* and the *Video Embeddings* of all available camera angles.
*   The Agent dynamically routes the view to the camera with the highest similarity score for that specific user at that specific second.

## 🎥 Live Logic Example

Here is how Owngoal serves two distinct users watching the **exact same minute** of a game:

**The Users:**
*   **User 1 (The Enthusiast):** Loves player interactions, close-ups, and raw emotion.
*   **User 2 (The Analyst):** Loves full-court flow, ball movement, and spacing.

**The Routing:**
```json
[
    {
        "Timestamp": "00:05",
        "Event": "Player Interaction",
        "User1_View": "2CAM", 
        "User2_View": "5CAM"
    },
    {
        "Timestamp": "00:23",
        "Event": "Fast Break Play",
        "User1_View": "BREP",
        "User2_View": "11CAM"
    },
    {
        "Timestamp": "01:32",
        "Event": "Timeout / Crowd Moment",
        "User1_View": "2CAM",
        "User2_View": "5CAM"
    }
]
```
## 🏗️ Architecture & Tech Stack

*   **Video Understanding**: TwelveLabs Marengo (Visual semantics & embeddings)
*   **User Reasoning**: Google Gemini (Generating User Embeddings)
*   **Decision Engine**: Python (`cos_sim_folder.py`)
*   **Backend/AI**: Python (Flash/Gemini Integration)
*   **Frontend**: TypeScript (React)
*   **Video Processing**: FFmpeg

## 📂 Project Structure

```bash
owngoal/
├── backend/                  # Python AI Pipeline (Gemini, TwelveLabs, Recommendation Logic)
├── frontend/                 # Client-side interface (TypeScript/React)
├── raw_footage/              # Input directory for raw game videos
├── processed_video_clips/    # Output directory for personalized clips
├── testvid/                  # Test assets
└── .gitignore
```
## 🧗 Challenges & Solutions

**Challenge 1: Low-Res Multi-View Footage**
Finding high-quality multi-angle datasets is difficult. We had to work with lower-resolution clips from broadcast archives.

**Challenge 2: TwelveLabs Marengo Limitations**
Marengo typically requires high-resolution inputs to generate accurate embeddings.
*   **Solution:** We developed a workaround by stitching an "All-Camera Combined Video" feed to pass into the Marengo model, allowing us to extract meaningful embeddings even from lower-quality sources.

## 🏆 Accomplishments

*   **Shared Embedding Alignment:** Successfully mapping abstract user desires ("I like funny moments") to specific visual vectors in a video feed.
*   **The Director Agent:** Created an automated agent that cuts video in real-time based on mathematical similarity scores, effectively "editing" the game live.

## 🚀 Getting Started

### Prerequisites
*   Node.js (v18+)
*   Python (v3.9+)
*   FFmpeg
*   API Keys: TwelveLabs, Google Gemini (Add to `.env` in backend)

### 1. Setup Backend (AI Director Engine)
The backend logic is written in Python.

1.  Navigate to the backend directory:
    ```bash
    cd backend
    ```

2.  Create a `.env` file in this folder and add your API keys:
    ```env
    TWELVE_LABS_API_KEY=your_key_here
    GEMINI_API_KEY=your_key_here
    ```

3.  Create a virtual environment (optional but recommended) and install dependencies:
    ```bash
    python -m venv venv
    source venv/bin/activate  # On Windows: venv\Scripts\activate
    
    pip install -r requirements.txt
    ```

4.  Run the Persona Generator and Recommendation scripts:
    ```bash
    # Step A: Generate User Persona Embeddings using Gemini
    python gemini_persona_generator.py

    # Step B: Embed Video Segments & Run Recommendation Logic
    python recommend_clips.py
    ```

### 2. Setup Frontend (User Interface)
The frontend is built with TypeScript and React.

1.  Open a new terminal and navigate to the frontend directory:
    ```bash
    cd frontend
    ```

2.  Install dependencies:
    ```bash
    npm install
    ```

3.  Start the development server:
    ```bash
    npm run dev
    # The app should be running at http://localhost:3000 (or similar)
    ```

## 🔮 What's Next?

*   **Organic Persona Learning:** Instead of asking users what they like, we will track when they increase volume or look away (distracted) to update their embedding vector automatically.
*   **High-Stakes Detection:** Automatically identifying "clutch" moments where all users, regardless of persona, should see the same high-intensity angle.

## 🤝 Contributing

Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.
