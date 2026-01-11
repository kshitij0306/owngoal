# Owngoal 🏀

**Owngoal** is a personalized camera viewer for basketball specifically designed to tailor the viewing experience based on user preferences. By leveraging video processing techniques, it transforms raw basketball footage into personalized clips, allowing users to focus on specific players or game highlights.

## 🚀 Features

- **Personalized Viewing**: Watch basketball game footage focused on specific preferences (e.g., player tracking, specific plays).
- **Automated Processing**: Python-based video processing scripts to analyze and cut raw footage.
- **Web Interface**: A modern TypeScript-based frontend to select preferences and view processed clips.
- **Backend API**: A TypeScript backend to manage data, video files, and user requests.

## 🛠️ Tech Stack

The project utilizes a full-stack approach with separate services for the frontend, backend, and video processing.

- **Frontend**: TypeScript (Likely React.js or Next.js)
- **Backend**: TypeScript (Node.js)
- **Video Processing**: Python (Computer Vision/Video Analysis)
- **Data/Storage**: Local file system (Raw/Processed footage)

## 📂 Project Structure

```bash
owngoal/
├── backend/                  # Server-side application (TypeScript/Node.js)
├── frontend/                 # Client-side application (TypeScript)
├── video_processing_scripts/ # Python scripts for video analysis and editing
├── raw_footage/              # Directory for input basketball videos
├── processed_video_clips/    # Directory where output clips are saved
├── testvid/                  # Test video files
└── .gitignore                # Git ignore configuration