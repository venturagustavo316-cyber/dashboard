const API_URL = "http://127.0.0.1:8000";

const balanceElement = document.getElementById("balance");
const incomeElement = document.getElementById("income");
const expensesElement = document.getElementById("expenses");
const transactionList = document.getElementById("transaction-list");
const appMessage = document.getElementById("app-message");
const addButton = document.getElementById("btn-add");
const dialog = document.getElementById("transaction-dialog");
const closeButton = document.getElementById("btn-close");
const form = document.getElementById("transaction-form");
const dateInput = document.getElementById("date");
const formError = document.getElementById("form-error");

const formatarMoeda = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

function dataLocalISO() {
  const hoje = new Date();
  const ano = hoje.getFullYear();
  const mes = String(hoje.getMonth() + 1).padStart(2, "0");
  const dia = String(hoje.getDate()).padStart(2, "0");
  return `${ano}-${mes}-${dia}`;
}

function mostrarMensagem(mensagem, erro = false) {
  appMessage.textContent = mensagem;
  appMessage.classList.toggle("message-error", erro);
}

function atualizarResumo(movimentacoes) {
  const receitas = movimentacoes
    .filter((item) => item.tipo === "receita")
    .reduce((total, item) => total + item.valor, 0);
  const despesas = movimentacoes
    .filter((item) => item.tipo === "despesa")
    .reduce((total, item) => total + item.valor, 0);

  incomeElement.textContent = formatarMoeda.format(receitas);
  expensesElement.textContent = formatarMoeda.format(despesas);
  balanceElement.textContent = formatarMoeda.format(receitas - despesas);
}

function criarLinhaMovimentacao(movimentacao) {
  const item = document.createElement("article");
  item.className = `transaction-item transaction-${movimentacao.tipo}`;

  const informacoes = document.createElement("div");
  informacoes.className = "transaction-info";

  const descricao = document.createElement("strong");
  descricao.textContent = movimentacao.descricao;

  const detalhe = document.createElement("span");
  const dataFormatada = new Date(`${movimentacao.data}T00:00:00`).toLocaleDateString("pt-BR");
  detalhe.textContent = `${movimentacao.categoria} · ${dataFormatada}`;

  const valor = document.createElement("strong");
  const sinal = movimentacao.tipo === "receita" ? "+ " : "− ";
  valor.className = "transaction-amount";
  valor.textContent = `${sinal}${formatarMoeda.format(movimentacao.valor)}`;

  const excluir = document.createElement("button");
  excluir.type = "button";
  excluir.className = "transaction-delete";
  excluir.textContent = "Delete";
  excluir.setAttribute("aria-label", `Delete ${movimentacao.descricao}`);
  excluir.addEventListener("click", () => removerMovimentacao(movimentacao.id));

  informacoes.append(descricao, detalhe);
  item.append(informacoes, valor, excluir);
  return item;
}

function renderizarMovimentacoes(movimentacoes) {
  transactionList.replaceChildren();

  if (movimentacoes.length === 0) {
    const vazio = document.createElement("p");
    vazio.className = "empty-state";
    vazio.textContent = "No transactions yet. Add your first one to get started.";
    transactionList.append(vazio);
    return;
  }

  movimentacoes.forEach((movimentacao) => {
    transactionList.append(criarLinhaMovimentacao(movimentacao));
  });
}

async function carregarMovimentacoes() {
  mostrarMensagem("Loading transactions…");

  try {
    const resposta = await fetch(`${API_URL}/movimentacoes`);
    if (!resposta.ok) throw new Error("The API could not load transactions.");

    const movimentacoes = await resposta.json();
    atualizarResumo(movimentacoes);
    renderizarMovimentacoes(movimentacoes);
    mostrarMensagem("");
  } catch (erro) {
    mostrarMensagem("Could not connect to the API. Start the FastAPI server and refresh this page.", true);
    transactionList.replaceChildren();
  }
}

async function removerMovimentacao(id) {
  try {
    const resposta = await fetch(`${API_URL}/movimentacoes/${id}`, { method: "DELETE" });
    if (!resposta.ok) throw new Error("Could not delete this transaction.");
    await carregarMovimentacoes();
  } catch (erro) {
    mostrarMensagem("Could not delete the transaction. Check that the API is running.", true);
  }
}

addButton.addEventListener("click", () => {
  formError.textContent = "";
  dateInput.value = dataLocalISO();
  dialog.showModal();
});

closeButton.addEventListener("click", () => dialog.close());

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  formError.textContent = "";

  const dados = new FormData(form);
  const movimentacao = {
    descricao: dados.get("descricao").trim(),
    valor: Number(dados.get("valor")),
    tipo: dados.get("tipo"),
    categoria: dados.get("categoria").trim(),
    data: dados.get("data"),
  };

  try {
    const resposta = await fetch(`${API_URL}/movimentacoes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(movimentacao),
    });

    if (!resposta.ok) {
      const erro = await resposta.json().catch(() => null);
      const detalhe = typeof erro?.detail === "string" ? erro.detail : null;
      throw new Error(detalhe || `The API could not save this transaction (HTTP ${resposta.status}).`);
    }

    form.reset();
    dialog.close();
    await carregarMovimentacoes();
  } catch (erro) {
    formError.textContent = erro instanceof TypeError
      ? "Could not connect to the API. Start it with: python -m uvicorn backend.api:app --reload"
      : erro.message || "Could not save the transaction.";
  }
});

carregarMovimentacoes();
