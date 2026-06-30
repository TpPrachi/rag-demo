Ollam official installer: 
curl -fsSL https://ollama.com/install.sh | sh


Pull a model and start:
ollama pull llama3.2
ollama serve       # if it didn't start automatically

Verify it's running:
curl http://localhost:11434
# should return: Ollama is running

Run Node Application:
node index.js