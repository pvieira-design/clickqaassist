document.addEventListener('DOMContentLoaded', () => {
  chrome.storage.sync.get(['webAppUrl', 'apiKey', 'userEmail'], (result) => {
    if (result.webAppUrl) document.getElementById('webAppUrl').value = result.webAppUrl;
    if (result.apiKey) document.getElementById('apiKey').value = result.apiKey;
    if (result.userEmail) document.getElementById('userEmail').value = result.userEmail;
  });

  document.getElementById('saveBtn').addEventListener('click', () => {
    const webAppUrl = document.getElementById('webAppUrl').value.trim();
    const apiKey = document.getElementById('apiKey').value.trim();
    const userEmail = document.getElementById('userEmail').value.trim();

    if (!webAppUrl || !apiKey || !userEmail) {
      showStatus('Preencha todos os campos', 'error');
      return;
    }

    chrome.storage.sync.set({ webAppUrl, apiKey, userEmail }, () => {
      showStatus('Salvo!', 'success');
    });
  });

  document.getElementById('testBtn').addEventListener('click', async () => {
    const webAppUrl = document.getElementById('webAppUrl').value.trim();
    const apiKey = document.getElementById('apiKey').value.trim();
    const userEmail = document.getElementById('userEmail').value.trim();

    if (!webAppUrl || !apiKey || !userEmail) {
      showStatus('Preencha todos os campos antes de testar', 'error');
      return;
    }

    const btn = document.getElementById('testBtn');
    btn.disabled = true;
    btn.textContent = 'Testando...';

    try {
      const response = await chrome.runtime.sendMessage({
        action: 'testConnection',
        data: { webAppUrl, apiKey, userEmail },
      });

      if (response.success) {
        showStatus(response.data.message, 'success');
      } else {
        showStatus(response.error, 'error');
      }
    } catch (err) {
      showStatus('Erro ao conectar: ' + err.message, 'error');
    } finally {
      btn.disabled = false;
      btn.textContent = 'Testar';
    }
  });

  function showStatus(message, type) {
    const status = document.getElementById('status');
    status.textContent = message;
    status.className = `status status--${type}`;
    setTimeout(() => {
      status.textContent = '';
      status.className = 'status';
    }, 4000);
  }
});
