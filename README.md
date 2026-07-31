# Voice AI

Kendi ses örneğinizle İngilizce, Almanca, İspanyolca, İtalyanca ve Portekizce metinleri seslendiren, API anahtarı gerektirmeyen açık kaynaklı Colab prototipi.

[![Open In Colab](https://colab.research.google.com/assets/colab-badge.svg)](https://colab.research.google.com/github/Dpehect/Voice-AI/blob/main/Voice_AI_Colab.ipynb)

> Bu proje yalnızca size ait veya kullanmak için açık izin aldığınız seslerle kullanılmalıdır.

## Neler sunuyor?

- Next.js, React ve TypeScript ile hızlı ve mobil uyumlu arayüz
- FastAPI tabanlı doğrulamalı ses üretim API'si
- XTTS-v2 ile beş hedef dil
- WAV, MP3 ve M4A referans ses desteği
- Otomatik ses normalizasyonu ve 3–30 saniye süre kontrolü
- 2.000 karaktere kadar metni güvenli parçalara bölme
- Konuşma hızı kontrolü
- Geçici dosyaları istek sonunda otomatik silme
- Modeli bir kez yükleyerek sonraki üretimleri hızlandırma
- Ücretli API anahtarı veya kredi kartı gerektirmeme

## En kolay kullanım: Google Colab

1. Yukarıdaki **Open in Colab** düğmesine basın.
2. Colab'da **Çalışma zamanı → Çalışma zamanı türünü değiştir → T4 GPU** seçin.
3. XTTS-v2 model lisansını okuyup notebook içindeki onay kutusunu işaretleyin.
4. Hücreleri sırasıyla çalıştırın.
5. Son hücrede gösterilen `Voice AI hazır` bağlantısını açın.
6. Temiz bir ses örneği yükleyin, dili seçin ve metni yazın.

Model ve bağımlılıklar Colab sunucusuna iner; Mac'inize büyük bir model indirilmez. İlk kurulum birkaç dakika sürebilir. Ücretsiz Colab GPU erişimi kotaya ve müsaitliğe bağlıdır.

## İyi ses örneği

- 6–20 saniye genellikle yeterlidir.
- Tek kişi konuşmalıdır.
- Arka planda müzik, yankı veya başka ses olmamalıdır.
- Normal hız ve doğal ton kullanılmalıdır.
- Hedef dilde noktalama işaretleri düzgün bir metin yazılmalıdır.

## Desteklenen diller

| Kod | Dil | Model adı |
| --- | --- | --- |
| `en` | İngilizce | English |
| `de` | Almanca | Deutsch |
| `es` | İspanyolca | Español |
| `it` | İtalyanca | Italiano |
| `pt` | Portekizce | Português |

## Yerel geliştirme

Ön koşullar: Node.js 20+, Python 3.10–3.12 ve FFmpeg.

### Arka uç

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements-dev.txt
export COQUI_TOS_AGREED=1
uvicorn app.main:app --reload
```

`COQUI_TOS_AGREED=1` değişkeni yalnızca XTTS-v2 model lisansını okuyup kabul ettiyseniz kullanılmalıdır.

### Ön yüz

```bash
cd frontend
npm install
NEXT_PUBLIC_API_URL=http://localhost:8000 npm run dev
```

Tarayıcıda `http://localhost:3000` adresini açın.

### Testler

```bash
cd backend && pytest
cd ../frontend && npm run lint && npm run typecheck && npm run build
```

## Mimari

```text
Next.js UI → FastAPI → FFmpeg ön işleme → XTTS-v2 → WAV çıktı
```

XTTS modeli ilk üretimde yüklenir ve aynı Colab oturumunda bellekte kalır. GPU bellek taşmasını önlemek için aynı anda tek üretim yapılır. Uzun metinler kontrollü parçalara bölünür ve kayıpsız WAV olarak birleştirilir.

## Sorun giderme

### “GPU sunucusu çevrimdışı”

Colab oturumu kapanmış olabilir. Notebook'taki başlatma hücresini yeniden çalıştırın ve yeni uygulama bağlantısını açın.

### İlk üretim çok uzun sürüyor

İlk istekte XTTS modeli GPU belleğine yüklenir. Sonraki üretimler daha hızlı olur. Colab çalışma zamanında GPU seçildiğini doğrulayın.

### Ses benzerliği düşük

Daha temiz, yankısız ve 6–20 saniyelik bir kayıt deneyin. Fısıltı, müzik ve telefon hoparlöründen yeniden kaydedilmiş ses kaliteyi düşürür.

### Colab GPU vermiyor

Ücretsiz GPU erişimi garanti edilmez. Daha sonra yeniden deneyebilir veya CPU ile çalıştırabilirsiniz; CPU üretimi belirgin biçimde daha yavaştır.

## Gizlilik ve güvenlik

- Yüklemeler ve sonuçlar yalnızca geçici çalışma klasöründe tutulur.
- Yanıt gönderildikten sonra geçici klasör silinir.
- Uygulama veritabanı veya kullanıcı hesabı içermez.
- Colab ve geçici tünel bağlantısı herkese açık olabileceğinden bağlantıyı paylaşmayın.
- Bir kişinin sesini izinsiz taklit etmek, kimliğe bürünmek veya yanıltıcı içerik üretmek için kullanmayın.

## Lisans notu

Bu repository içindeki özgün uygulama kodu MIT lisanslıdır. XTTS-v2 model ağırlıkları ayrı **Coqui Public Model License** koşullarına tabidir. Özellikle ticari kullanım öncesinde model lisansını ayrıca inceleyin. Repository lisansı model ağırlıklarının lisansını değiştirmez.

