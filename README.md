# Owngoal 🏀

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

## 🏗️ Architecture & Tech Stack

*   **Video Understanding**: TwelveLabs Marengo (Visual semantics & embeddings)
*   **User Reasoning**: Google Gemini (Generating User Embeddings)
*   **Decision Engine**: Python (Cosine Similarity calculations)
*   **Backend**: TypeScript (Node.js)
*   **Frontend**: TypeScript (React)
*   **Video Processing**: FFmpeg

## 📂 Project Structure

```bash
owngoal/
├── backend/                  # Server-side application (TypeScript)
├── frontend/                 # Client-side interface (TypeScript/React)
├── video_processing_scripts/ # Python scripts for AI analysis and cutting
├── raw_footage/              # Input directory for raw game videos
├── processed_video_clips/    # Output directory for personalized clips
├── testvid/                  # Test assets
└── .gitignore

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
*   API Keys: TwelveLabs, Google Gemini

### 1. Setup Backend
```bash
cd backend
npm install
npm run dev
```

### 2. Setup Frontend
Navigate to the scripts folder to process raw footage.
```bash
cd video_processing_scripts

# Install dependencies
pip install -r requirements.txt

# Run the embedding and selection script
python main.py
```
## 🔮 What's Next?

*   **Organic Persona Learning:** Instead of asking users what they like, we will track when they increase volume or look away (distracted) to update their embedding vector automatically.
*   **High-Stakes Detection:** Automatically identifying "clutch" moments where all users, regardless of persona, should see the same high-intensity angle.

## 🤝 Contributing

Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.