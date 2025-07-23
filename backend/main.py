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
from TTS.tts.configs.xtts_config import XttsConfig
from TTS.tts.models.xtts import XttsAudioConfig, XttsArgs
from TTS.config.shared_configs import BaseDatasetConfig
from scipy.io.wavfile import write as write_wav

# PyTorch 2.6+ 호환성 문제 해결
# 모델 로드에 필요한 클래스들을 안전한 것으로 등록
torch.serialization.add_safe_globals([XttsConfig, XttsAudioConfig, BaseDatasetConfig, XttsArgs])

# 로깅 설정
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Coqui TTS 모델 초기화
coqui_tts = None

def get_coqui_tts():
    global coqui_tts
    if coqui_tts is None:
        try:
            logger.info("Coqui TTS 모델을 로드하는 중...")
            model_name = "tts_models/multilingual/multi-dataset/xtts_v2"
            coqui_tts = TTS(model_name=model_name, progress_bar=True, gpu=False)
            logger.info("Coqui TTS 모델이 성공적으로 로드되었습니다.")
        except Exception as e:
            logger.error(f"Coqui TTS 모델 로드 중 오류 발생: {e}")
            raise HTTPException(status_code=500, detail="Coqui TTS 모델 로드 실패.")
    return coqui_tts

app = FastAPI()

class TTSRequest(BaseModel):
    text: str
    engine: str = "coqui"  # 'coqui' 또는 'google'
    speaker: str = None
    language: str = "ko"

@app.get("/")
def read_root():
    return {"message": "TTS 서버가 실행 중입니다. /api/tts 엔드포인트를 사용하세요."}

@app.post("/api/tts")
async def text_to_speech(request: TTSRequest):
    if not request.text:
        raise HTTPException(status_code=400, detail="텍스트는 비워둘 수 없습니다.")

    logger.info(f"'{request.engine}' 엔진으로 TTS 요청 수신: '{request.text}'")

    try:
        if request.engine not in ["google", "coqui"]:
            raise HTTPException(status_code=400, detail="잘못된 엔진 이름입니다. 'coqui' 또는 'google'을 사용하세요.")

        if request.engine == "google":
            # gTTS 사용
            tts = gTTS(text=request.text, lang=request.language, slow=False)
            fp = io.BytesIO()
            tts.write_to_fp(fp)
            fp.seek(0)
            return StreamingResponse(fp, media_type="audio/mpeg")

        elif request.engine == "coqui":
            # Coqui TTS 사용
            tts_model = get_coqui_tts()
            if tts_model is None:
                raise HTTPException(status_code=500, detail="Coqui TTS 모델을 사용할 수 없습니다.")
            
            # 텍스트를 음성(Numpy 배열)으로 변환
            wav_chunks = tts_model.tts(text=request.text, speaker="Daisy Studios", language=request.language)
            
            # tts()가 리스트를 반환하면, 이를 단일 numpy 배열로 합칩니다.
            if isinstance(wav_chunks, list):
                wav = np.concatenate(wav_chunks)
            else:
                wav = wav_chunks

            # Numpy 배열을 WAV 형식으로 메모리 내 버퍼에 씁니다.
            buffer = io.BytesIO()
            write_wav(buffer, tts_model.synthesizer.output_sample_rate, wav)
            buffer.seek(0)
            
            logger.info("Coqui TTS 오디오 스트리밍 시작.")
            return StreamingResponse(buffer, media_type="audio/wav")

    except HTTPException as e:
        raise e
    except Exception as e:
        logger.error(f"TTS 합성 중 오류 발생: {e}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)

