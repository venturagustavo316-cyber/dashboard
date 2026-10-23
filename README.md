# FinFlow

Dashboard financeiro em HTML, CSS e JavaScript, com uma API FastAPI e banco SQLite.

## Executar localmente

Na pasta do projeto, crie e ative um ambiente virtual no PowerShell e instale as dependências:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
```

Inicie a API:

```powershell
python -m uvicorn backend.api:app --reload
```

Abra `src/index.html` com o Live Server na porta `5500`. A documentação interativa da API estará em <http://127.0.0.1:8000/docs>.

## Movimentações

A API permite listar, cadastrar e excluir movimentações em `/movimentacoes`. O SQLite cria o arquivo `backend/finflow.db` automaticamente; esse banco local é ignorado pelo Git e não deve ser enviado ao repositório.
