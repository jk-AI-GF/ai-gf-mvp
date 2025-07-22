import os
from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse
from pydantic import BaseModel
from TTS.api import TTS
import uvicorn
import tempfile
import logging

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Get device
# device = "cuda" if torch.cuda.is_available() else "cpu"

# Initialize TTS model
try:
    logger.info("Loading TTS model...")
    # You can change the model here.
    # List available models: `tts --list_models`
    model_name = "tts_models/en/ljspeech/tacotron2-DDC"
    tts = TTS(model_name=model_name, progress_bar=True, gpu=False) # Set gpu=True if you have a CUDA-enabled GPU
    logger.info("TTS model loaded successfully.")
except Exception as e:
    logger.error(f"Error loading TTS model: {e}")
    tts = None

app = FastAPI()

class TTSRequest(BaseModel):
    text: str

@app.get("/")
def read_root():
    return {"message": "Coqui TTS server is running"}

@app.post("/api/tts")
async def text_to_speech(request: TTSRequest):
    if tts is None:
        raise HTTPException(status_code=500, detail="TTS model is not available.")

    try:
        text = request.text
        if not text:
            raise HTTPException(status_code=400, detail="Text cannot be empty.")

        logger.info(f"Received TTS request for text: '{text}'")

        # Create a temporary file to save the audio
        with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as fp:
            output_path = fp.name

        # Synthesize speech
        logger.info(f"Synthesizing speech to {output_path}...")
        tts.tts_to_file(text=text, file_path=output_path)
        logger.info("Speech synthesized successfully.")

        # Return the audio file
        return FileResponse(output_path, media_type="audio/wav", filename="output.wav")

    except Exception as e:
        logger.error(f"An error occurred during TTS synthesis: {e}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
