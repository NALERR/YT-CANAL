const formulario = document.getElementById('form');
const resultado = document.getElementById('resultado');

formulario.addEventListener('submit', function (e) {
  e.preventDefault();

  resultado.textContent = 'Cargando...';

  const enlace = formulario.url.value;

  fetch('/transcribir', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ url: enlace })
  })


.then(async (res) => {
  const text = await res.text();
  console.log('Respuesta sin parsear:', text);

  try {
    const data = JSON.parse(text);
    if (data.texto) {
      resultado.innerHTML = `
        <p class="mb-4 whitespace-pre-wrap">${data.texto}</p>
        <a href="${data.archivo}" download class="inline-block bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition">
          Descargar transcripción
        </a>
      `;
    } else {
      resultado.textContent = 'No se pudo transcribir.';
    }
  } catch (e) {
    resultado.textContent = 'Respuesta inválida del servidor:\n' + text;
  }
})



});