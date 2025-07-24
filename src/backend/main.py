import io
import logging
import uvicorn
import torch
import numpy as np
from fastapi import FastAPI, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from gtts import gTTS
from TTS.api import TTS
from scipy.io.wavfile import write as write_wav

# 로깅 설정
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Coqui TTS 모델 초기화
coqui_tts = None

def get_coqui_tts():
    global coqui_tts
    if coqui_tts is None:
        logger.info("Coqui TTS 모델을 로드하는 중...")
        coqui_tts = TTS(
            model_name="tts_models/ko/kss/glow-tts",  # ⬅ 단일 화자 한국어 모델
            progress_bar=True,
            gpu=False
        )
        logger.info("Coqui TTS 모델 로드 완료.")
    return coqui_tts

from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

# CORS 미들웨어 추가
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class TTSRequest(BaseModel):
    text: str
    engine: str = "coqui"  # 'coqui' 또는 'google'

@app.get("/")
def read_root():
    return {"message": "TTS 서버가 실행 중입니다. /api/tts 엔드포인트를 사용하세요."}

@app.post("/api/tts")
async def text_to_speech(req: TTSRequest):
    if not req.text:
        raise HTTPException(400, "텍스트는 비워둘 수 없습니다.")

    logger.info(f"TTS 요청: engine={req.engine}, text={req.text!r}")

    if req.engine == "google":
        fp = io.BytesIO()
        gTTS(req.text, lang="en", slow=False).write_to_fp(fp)
        fp.seek(0)
        return StreamingResponse(fp, media_type="audio/mpeg")

    if req.engine == "coqui":
        tts_model = get_coqui_tts()
        wav = tts_model.tts(req.text)   # ⬅ language, speaker 인자 없음
        if isinstance(wav, list):
            wav = np.concatenate(wav)
        buf = io.BytesIO()
        write_wav(buf, tts_model.synthesizer.output_sample_rate, wav)
        buf.seek(0)
        return StreamingResponse(buf, media_type="audio/wav")

    raise HTTPException(400, "지원되지 않는 엔진입니다.")

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
