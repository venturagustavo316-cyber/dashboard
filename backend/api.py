from datetime import date
from contextlib import contextmanager
from pathlib import Path
import sqlite3
from typing import Literal

from fastapi import FastAPI, HTTPException, Response, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field


DATABASE_PATH = Path(__file__).with_name("finflow.db")

app = FastAPI(title="FinFlow API", version="0.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://127.0.0.1:5500",
        "http://localhost:5500",
        "http://127.0.0.1:5501",
        "http://localhost:5501",
    ],
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1)(:\d+)?$",
    allow_methods=["GET", "POST", "DELETE"],
    allow_headers=["Content-Type"],
)


class MovimentacaoNova(BaseModel):
    descricao: str = Field(min_length=1, max_length=100)
    valor: float = Field(gt=0)
    tipo: Literal["receita", "despesa"]
    categoria: str = Field(min_length=1, max_length=60)
    data: date


@contextmanager
def conectar_banco():
    conexao = sqlite3.connect(DATABASE_PATH)
    conexao.row_factory = sqlite3.Row
    try:
        yield conexao
        conexao.commit()
    finally:
        conexao.close()


def inicializar_banco():
    with conectar_banco() as conexao:
        conexao.execute(
            """
            CREATE TABLE IF NOT EXISTS movimentacoes (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                descricao TEXT NOT NULL,
                valor REAL NOT NULL CHECK (valor > 0),
                tipo TEXT NOT NULL CHECK (tipo IN ('receita', 'despesa')),
                categoria TEXT NOT NULL,
                data TEXT NOT NULL
            )
            """
        )


def converter_movimentacao(linha):
    return {
        "id": linha["id"],
        "descricao": linha["descricao"],
        "valor": linha["valor"],
        "tipo": linha["tipo"],
        "categoria": linha["categoria"],
        "data": linha["data"],
    }


inicializar_banco()


@app.get("/")
def inicio():
    return {"mensagem": "API do FinFlow esta funcionando"}


@app.get("/movimentacoes")
def listar_movimentacoes():
    with conectar_banco() as conexao:
        linhas = conexao.execute(
            "SELECT * FROM movimentacoes ORDER BY data DESC, id DESC"
        ).fetchall()
    return [converter_movimentacao(linha) for linha in linhas]


@app.post("/movimentacoes", status_code=status.HTTP_201_CREATED)
def criar_movimentacao(movimentacao: MovimentacaoNova):
    descricao = movimentacao.descricao.strip()
    categoria = movimentacao.categoria.strip()
    if not descricao or not categoria:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Descricao e categoria nao podem ficar vazias.",
        )

    with conectar_banco() as conexao:
        cursor = conexao.execute(
            """
            INSERT INTO movimentacoes (descricao, valor, tipo, categoria, data)
            VALUES (?, ?, ?, ?, ?)
            """,
            (
                descricao,
                movimentacao.valor,
                movimentacao.tipo,
                categoria,
                movimentacao.data.isoformat(),
            ),
        )
        linha = conexao.execute(
            "SELECT * FROM movimentacoes WHERE id = ?", (cursor.lastrowid,)
        ).fetchone()
    return converter_movimentacao(linha)


@app.delete("/movimentacoes/{movimentacao_id}", status_code=status.HTTP_204_NO_CONTENT)
def excluir_movimentacao(movimentacao_id: int):
    with conectar_banco() as conexao:
        cursor = conexao.execute(
            "DELETE FROM movimentacoes WHERE id = ?", (movimentacao_id,)
        )
    if cursor.rowcount == 0:
        raise HTTPException(status_code=404, detail="Movimentacao nao encontrada.")
    return Response(status_code=status.HTTP_204_NO_CONTENT)
