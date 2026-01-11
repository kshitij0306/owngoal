import time
from twelvelabs import TwelveLabs, VideoInputRequest, MediaSource

# 1. Initialize the client
client = TwelveLabs(api_key="<YOUR_API_KEY>")

# 2. Upload a video
asset = client.assets.create(
    method="url",
    url="<YOUR_VIDEO_URL>" # Use direct links to raw media files. Video hosting platforms and cloud storage sharing links are not supported
    # Or use method="direct" and file=open("<PATH_TO_VIDEO_FILE>", "rb") to upload a file from the local file system
)
print(f"Created asset: id={asset.id}")

# 3. Create video embeddings
response = client.embed.v_2.create(
    input_type="video",
    model_name="marengo3.0",
    video=VideoInputRequest(
        media_source=MediaSource(
            asset_id=asset.id,
        ),
    ),
)

# 4. Process the results
print(f"\n{'='*80}")
print(f"EMBEDDINGS SUMMARY: {len(response.data)} total embeddings")
print(f"{'='*80}\n")

for idx, embedding_data in enumerate(response.data, 1):
    print(f"[{idx}/{len(response.data)}] {embedding_data.embedding_option.upper()} | {embedding_data.embedding_scope.upper()}")
    print(f"├─ Time range: {embedding_data.start_sec}s - {embedding_data.end_sec}s")
    print(f"├─ Dimensions: {len(embedding_data.embedding)}")
    print(f"└─ First 10 values: {embedding_data.embedding[:10]}")
    print()
