# Voice AI

Open-source multilingual voice-cloning and text-to-speech prototype powered by XTTS-v2. Upload authorized voice samples, select a target language, enter text, and generate WAV speech in the selected voice — without a paid API key.

[![Open in Colab](https://colab.research.google.com/assets/colab-badge.svg)](https://colab.research.google.com/github/Dpehect/Voice-AI/blob/main/Voice_AI_Colab.ipynb)

> [!IMPORTANT]
> Use only your own voice or recordings for which you have explicit permission. Do not use this project for impersonation, deception, fraud, or unauthorized voice cloning.

## How to Run Voice AI Every Time

You do not need to install the project on your Mac. Follow this checklist whenever you want to use it:

1. Open the [Voice AI Google Colab notebook](https://colab.research.google.com/github/Dpehect/Voice-AI/blob/main/Voice_AI_Colab.ipynb).
2. Sign in to your Google account if Colab asks.
3. From the Colab menu, select **Runtime → Change runtime type**.
4. Set **Hardware accelerator** to **T4 GPU**, then save.
5. In the first consent code cell, make sure both values are:

~~~python
accept_xtts_license = True
confirm_voice_permission = True
~~~

6. Press the play button next to that cell. It should print **Onaylar kaydedildi**.
7. Run the code cell under **2. Kurulum / Installation**. Wait until it prints **Kurulum tamamlandı**. The first installation can take several minutes.
8. Run the code cell under **3. Uygulamayı başlat / Start the application**.
9. Keep the Colab tab open and wait for the green **Voice AI hazır** panel.
10. Click **Voice AI'ı aç** to open the application.
11. Add an authorized WAV, MP3, or M4A voice sample.
12. Select the saved voice, choose a target language, type the text in that language, confirm permission, and click **Sesimi oluştur**.
13. Preview the result or download it as a WAV file.

> [!NOTE]
> Colab sessions and application links are temporary. The next day, repeat this checklist and use the newly generated link. Yesterday's link will usually no longer work.

### If the notebook was already open

The GitHub version may have changed. Run this in a new Colab code cell before starting:

~~~python
!git -C /content/Voice-AI pull --ff-only
~~~

If the folder does not exist yet, skip this command and run the **Installation** cell normally.

### What must stay open

- Keep the Google Colab tab open while using Voice AI.
- Do not stop the running Colab cells.
- Do not close or disconnect the runtime during generation.
- The first voice generation loads XTTS-v2 and may take several minutes.

## Features

- Multilingual voice cloning with XTTS-v2
- English, German, Spanish, Italian, and Portuguese output
- Multiple named voice samples in a browser-based voice library
- Local browser persistence with IndexedDB
- Text-to-speech with the selected voice and target language
- WAV, MP3, and M4A reference-audio support
- Automatic validation and normalization with FFmpeg
- 3–30 second reference-audio validation
- Up to 2,000 characters per request with safe text chunking
- Adjustable speech speed
- Automatic cleanup of temporary backend files
- Next.js, React, and TypeScript frontend
- FastAPI backend with GPU-aware XTTS-v2 loading
- Free Google Colab workflow with no paid API key required

## Quick Start with Google Colab

The easiest free way to run Voice AI is Google Colab.

1. Open the [Voice AI Colab notebook](https://colab.research.google.com/github/Dpehect/Voice-AI/blob/main/Voice_AI_Colab.ipynb).
2. Select **Runtime → Change runtime type → T4 GPU**.
3. Set both consent values to **True**:

~~~python
accept_xtts_license = True
confirm_voice_permission = True
~~~

4. Run the consent cell.
5. Run the **2. Kurulum / Installation** cell and wait for it to finish.
6. Run the **3. Uygulamayı başlat / Start the application** cell.
7. Wait for the green **Voice AI is ready** panel.
8. Open the generated application link.
9. Add a voice sample, select the voice and language, enter text, confirm permission, and generate speech.

The first generation downloads and loads XTTS-v2, so it can take several minutes. Later generations in the same Colab session are faster.

## Running It Again Tomorrow

Colab sessions are temporary. To use the project on another day:

1. Open the [same Colab notebook](https://colab.research.google.com/github/Dpehect/Voice-AI/blob/main/Voice_AI_Colab.ipynb).
2. Select a **T4 GPU** runtime.
3. Confirm that both consent values are **True**.
4. Run the notebook cells from top to bottom.
5. Wait for the new temporary application URL.
6. Open the URL and use the voice library.

Every new Colab session creates a new application URL. Do not reuse yesterday's URL.

## How It Works

~~~text
Next.js UI
    ↓
FastAPI API
    ↓
FFmpeg validation and normalization
    ↓
XTTS-v2 voice cloning on GPU
    ↓
WAV output
~~~

The selected voice sample is uploaded only when speech is generated. The backend normalizes the recording, splits long text into safe chunks, runs XTTS-v2 sequentially, joins the generated WAV parts, applies the selected speed, and removes temporary server files after the response.

## Voice Library

- Add up to 20 WAV, MP3, or M4A voice samples.
- Rename samples and switch between them before generation.
- The library is stored locally in the current browser using IndexedDB.
- Voice samples are not permanently uploaded to the backend.
- Clearing browser website data also deletes the local voice library.
- A different browser or browser profile has a separate library.

## Supported Languages

| Code | Language | Native name |
| --- | --- | --- |
| en | English | English |
| de | German | Deutsch |
| es | Spanish | Español |
| it | Italian | Italiano |
| pt | Portuguese | Português |

Write the input text in the selected target language. The application clones voice characteristics; it does not translate text automatically.

## Recommended Voice Sample

- 6–20 seconds is usually ideal.
- Use a single speaker.
- Record in a quiet room.
- Avoid music, echo, background speech, and strong noise.
- Speak naturally at a normal pace.
- Prefer a direct microphone recording over replayed audio.

## Local Development

### Requirements

- Node.js 20 or newer
- Python 3.10–3.12
- FFmpeg
- NVIDIA GPU recommended for practical XTTS-v2 inference

### Backend

~~~bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements-dev.txt
export COQUI_TOS_AGREED=1
uvicorn app.main:app --reload
~~~

Set **COQUI_TOS_AGREED=1** only after reading and accepting the XTTS-v2 model license.

### Frontend

~~~bash
cd frontend
npm install
NEXT_PUBLIC_API_URL=http://localhost:8000 npm run dev
~~~

Open [http://localhost:3000](http://localhost:3000).

## Validation

~~~bash
cd backend
pytest

cd ../frontend
npm run lint
npm run typecheck
npm run build
~~~

Run the real five-language XTTS-v2 acceptance test while the backend is running:

~~~bash
python scripts/acceptance_test.py /path/to/authorized-reference.m4a
~~~

Generated validation files are written to **acceptance-results/**.

## Troubleshooting

### GPU server is offline

The Colab runtime or temporary tunnel has stopped. Restart the notebook and use the newly generated application URL.

### The first generation is slow

XTTS-v2 is downloaded and loaded into GPU memory on the first request. Do not interrupt the first generation.

### Coqui TTS is not installed

Pull the latest repository changes and rerun the installation cell. The project pins a Transformers version compatible with the current Coqui TTS package.

### Colab does not provide a GPU

Free GPU availability is not guaranteed. Try again later. CPU inference is possible but significantly slower.

### Voice similarity is weak

Use a clean, natural, echo-free recording between 6 and 20 seconds. Avoid whispered speech and heavily compressed or replayed audio.

### The application link no longer works

Colab URLs are temporary. Reopen the notebook, start a new session, and use the new URL.

## Privacy and Safety

- Backend uploads and generated files are temporary.
- Temporary request directories are deleted after a response.
- The browser voice library stays on the user's device.
- The project has no user accounts or cloud database.
- Temporary tunnel URLs can be reachable from the internet; do not share them.
- Do not clone a person's voice without explicit permission.
- Do not use generated audio to impersonate someone or mislead listeners.

## License

The original application code in this repository is available under the [MIT License](LICENSE).

XTTS-v2 model weights are distributed under the separate Coqui Public Model License. Review the model license before use, especially for commercial purposes. The repository's MIT license does not change the model weights' license.
