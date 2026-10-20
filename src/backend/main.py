from fastapi import FastAPI

app = FastAPI()


#valores de teste
@app.get("/api/movimentacoes")
async def listar_movimentacoes():
    return [
        {
            "id": 1,
            "descricao": "salario",
            "valor": 4000,
            "tipo": "receita",
            "categoria": "salario",
            "data": "2023-10-14"
        }
    ]