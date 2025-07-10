
const form = document.getElementById('canal-form');
const resultado = document.getElementById('canal-resultado');

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  resultado.textContent = 'Procesando canal...';

  const url = form['canal-url'].value;

  try {
    const res = await fetch('/transcribir-canal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    });

    const data = await res.json();

    if (data.resultado && Array.isArray(data.resultado)) {
      resultado.innerHTML = data.resultado
        .map((item, idx) => `
          <div class="mb-4">
            <h3 class="font-semibold mb-1">📼 Video ${idx + 1}</h3>
            <pre class="whitespace-pre-wrap bg-gray-100 p-2 rounded">${item.texto}</pre>
          </div>
        `).join('');
    } else {
      resultado.textContent = 'No se pudo procesar el canal.';
    }
  } catch (err) {
    resultado.textContent = 'Error: ' + err.message;
  }
});