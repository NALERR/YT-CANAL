import sys
import whisper
import warnings

warnings.filterwarnings("ignore")

if len(sys.argv) <2:
    sys.exit(1)


ruta_audio = sys.argv[1]
modelo = whisper.load_model("base")

resultado=modelo.transcribe(ruta_audio)

print (resultado["text"])