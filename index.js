const express = require('express');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

app.post('/transcribir', async (req, res) => {
  const url = req.body.url;

  if (!url) {
    res.status(400).send('No hay URL');
    return;
  }

  const nombreArchivo = `audio-${Date.now()}.mp3`;
  const rutaAudio = path.join(__dirname, nombreArchivo);

  // Descargar el audio con yt-dlp
  const comando = spawn('yt-dlp', [
    '-x',
    '--audio-format', 'mp3',
    '-o', rutaAudio,
    url
  ]);

  comando.stdout.on('data', (data) => {
    console.log('yt-dlp dice:', data.toString());
  });

  comando.stderr.on('data', (data) => {
    console.log('yt-dlp error:', data.toString());
  });

  comando.on('close', async (code) => {
    if (code !== 0) {
      res.status(500).send('No se pudo descargar el audio');
      return;
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
  const textoLimpio = salida.trim();

  // ⚠️ Asegúrate de que solo respondemos una vez
  if (res.headersSent) return;

  if (code === 0 && textoLimpio.length > 0) {
    const nombreTexto = `transcripcion-${Date.now()}.txt`;
    const rutaTexto = path.join(__dirname, 'public', nombreTexto);

    try {

      fs.writeFileSync(rutaTexto, textoLimpio, 'UTF-8');

      res.setHeader('Content-Type','application/json; charset=utf-8')
      res.json({
        texto: textoLimpio,
        archivo: `/${nombreTexto}`
      });
    } catch (err) {
      console.error('Error al guardar archivo:', err);
      res.status(500).json({ error: 'No se pudo guardar el archivo' });
    }
  } else {
    res.status(500).json({ error: 'Error al ejecutar la transcripción' });
  }

  // ⚠️ fs.unlink va después, pero no debe tener res.json dentro
  fs.unlink(rutaAudio, (err) => {
    if (err) console.log('No se pudo borrar el audio:', err);
  });
});

  });
});

app.listen(PORT, () => {
  console.log('Servidor corriendo en http://localhost:' + PORT);
});