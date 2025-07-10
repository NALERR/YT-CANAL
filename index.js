const express = require('express');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Función para transcribir un solo video por URL
function transcribirVideo(url) {
  return new Promise((resolve, reject) => {
    const nombreArchivo = `audio-${Date.now()}.mp3`;
    const rutaAudio = path.join(__dirname, nombreArchivo);

    // Descargar el audio con yt-dlp
    const comando = spawn('yt-dlp', [
      '-x',
      '--audio-format',
      'mp3',
      '-o',
      rutaAudio,
      url,
    ]);

    comando.stdout.on('data', (data) => {
      console.log('yt-dlp dice:', data.toString());
    });

    comando.stderr.on('data', (data) => {
      console.log('yt-dlp error:', data.toString());
    });

    comando.on('close', (code) => {
      if (code !== 0) {
        return reject(new Error('No se pudo descargar el audio'));
      }

      console.log('Audio descargado:', rutaAudio);

      // Ejecutar script Python con Whisper local
      const python = spawn('python', ['transcribir.py', rutaAudio]);

      let salida = '';
      python.stdout.on('data', (data) => {
        salida += data.toString();
      });

      python.stderr.on('data', (data) => {
        console.error('Error Python:', data.toString());
      });

      python.on('close', (code) => {
        // Eliminar el archivo de audio siempre
        fs.unlink(rutaAudio, (err) => {
          if (err) console.log('No se pudo borrar el audio:', err);
        });

        if (code === 0) {
          const textoLimpio = salida.trim();
          if (textoLimpio.length > 0) {
            return resolve(textoLimpio);
          } else {
            return reject(new Error('Transcripción vacía'));
          }
        } else {
          return reject(new Error('Error al ejecutar la transcripción'));
        }
      });
    });
  });
}

// Endpoint para transcribir un solo video
app.post('/transcribir', async (req, res) => {
  const url = req.body.url;
  if (!url) return res.status(400).send('No hay URL');

  try {
    const texto = await transcribirVideo(url);

    const nombreTexto = `transcripcion-${Date.now()}.txt`;
    const rutaTexto = path.join(__dirname, 'public', nombreTexto);

    fs.writeFileSync(rutaTexto, texto, 'UTF-8');

    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.json({ texto, archivo: `/${nombreTexto}` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Endpoint para transcribir primeros 3 videos de un canal
app.post('/transcribir-canal', async (req, res) => {
  const url = req.body.url;
  if (!url) return res.status(400).send('URL de canal requerida');

  const ytDlp = spawn('yt-dlp', ['--flat-playlist', '--dump-json', url]);

  let salida = '';
  ytDlp.stdout.on('data', (data) => (salida += data.toString()));
  ytDlp.stderr.on('data', (data) => console.error('yt-dlp:', data.toString()));

  ytDlp.on('close', async () => {
    try {
      const lineas = salida.trim().split('\n');
      const ids = lineas
        .map((l) => {
          try {
            return JSON.parse(l).id;
          } catch {
            return null;
          }
        })
        .filter(Boolean);

      const resultados = [];

      for (const id of ids.slice(0, 3)) {
        const videoUrl = `https://www.youtube.com/watch?v=${id}`;
        const texto = await transcribirVideo(videoUrl);
        resultados.push({ videoUrl, texto });
      }

      res.json({ resultado: resultados });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Error al transcribir el canal' });
    }
  });
});

app.listen(PORT, () => {
  console.log('Servidor corriendo en http://localhost:' + PORT);
});