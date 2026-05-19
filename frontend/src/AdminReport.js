// frontend/src/AdminReport.js

import React, { useMemo, useState } from "react";
import {
  BarChart3,
  Brain,
  Church,
  Download,
  FileText,
  Loader2,
  RefreshCw,
  Users
} from "lucide-react";
import { db, collection, getDocs, query, orderBy } from "./firebase";

const API_BASE_URL = process.env.REACT_APP_API_URL || "";

function normalizeText(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function getNumericTalentValue(value) {
  const match = String(value || "").match(/[1-5]/);
  return match ? Number(match[0]) : null;
}

function countKeywords(records, words) {
  const allText = records
    .map((record) => Object.values(record.respostas || {}).join(" "))
    .join(" ")
    .toLowerCase();

  return words.map((word) => ({
    word,
    count: (allText.match(new RegExp(word, "gi")) || []).length
  }));
}

function buildLocalReport(records, stats) {
  return `RELATÓRIO GERAL — MENTE PRÓSPERA

Total de participantes: ${stats.total}

DIAGNÓSTICO GERAL DA IGREJA

A pesquisa mostra que a igreja possui pessoas em diferentes estágios de mentalidade financeira e espiritual. Algumas ainda nunca pensaram seriamente sobre investimento, outras carregam medo de perda, e uma parte demonstra crenças negativas sobre riqueza.

O principal bloqueio encontrado não parece ser ganância. O principal bloqueio é falta de conhecimento, medo, falta de tempo e ausência de uma visão bíblica clara sobre mordomia financeira.

PRINCIPAIS PADRÕES ENCONTRADOS

1. Medo de perder dinheiro
Algumas respostas mostram preocupação com perda, insegurança e receio de que o dinheiro desapareça.

2. Crenças negativas sobre pessoas ricas
${stats.negativeRichBeliefCount} participante(s) indicaram algum nível de associação negativa com pessoas ricas.

3. Falta de educação financeira
Muitas respostas apontam para falta de estudo, falta de tempo ou falta de exposição ao tema.

4. Talentos financeiros enterrados
A média da escala de talentos enterrados foi ${stats.averageTalentScore || "não identificada"} de 5.

LEITURA BÍBLICA

A igreja precisa ser ensinada que prosperidade com propósito não é idolatria. Ganância é pecado, mas mordomia, diligência, sabedoria e multiplicação são princípios bíblicos.

A Parábola dos Talentos mostra que Deus não elogia o medo que enterra recursos. Deus valoriza fidelidade, administração e multiplicação.

PLANO DE AÇÃO PARA A IGREJA

1. Criar uma série de estudos sobre mordomia financeira cristã.
2. Ensinar diferença entre ganância e prosperidade com propósito.
3. Oferecer aulas básicas sobre orçamento, dívidas, poupança e investimentos.
4. Criar pequenos grupos de educação financeira.
5. Ajudar os membros a vencerem medo, vergonha e crenças limitantes sobre dinheiro.

CONCLUSÃO

A igreja não precisa ser empurrada para amar dinheiro. A igreja precisa ser ensinada a amar sabedoria, administrar bem recursos e usar prosperidade como ferramenta de serviço, generosidade e propósito.`;
}

export default function AdminReport() {
  const [records, setRecords] = useState([]);
  const [aiReport, setAiReport] = useState("");
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");

  const stats = useMemo(() => {
    const total = records.length;

    const negativeRichBeliefCount = records.filter((record) => {
      const respostas = record.respostas || {};
      const answer =
        respostas.crenca_sobre_ricos ||
        respostas.pergunta2 ||
        respostas["1"] ||
        "";
      const normalized = normalizeText(answer);

      return (
        normalized.includes("sim") ||
        normalized.includes("egoista") ||
        normalized.includes("gananc") ||
        normalized.includes("fria") ||
        normalized.includes("frias")
      );
    }).length;

    const talentScores = records
      .map((record) => {
        const respostas = record.respostas || {};
        return getNumericTalentValue(
          respostas.talentos_enterrados || respostas.pergunta4 || respostas["3"]
        );
      })
      .filter((value) => value !== null);

    const averageTalentScore =
      talentScores.length > 0
        ? (
            talentScores.reduce((sum, value) => sum + value, 0) /
            talentScores.length
          ).toFixed(1)
        : null;

    const keywordCounts = countKeywords(records, [
      "medo",
      "tempo",
      "dinheiro",
      "perder",
      "investir",
      "rico",
      "igreja",
      "não sei",
      "nada"
    ]);

    const noInvestmentThoughtCount = records.filter((record) => {
      const text = normalizeText(Object.values(record.respostas || {}).join(" "));
      return text.includes("nunca pensei") || text.includes("nunca");
    }).length;

    const lackOfTimeCount = records.filter((record) => {
      const text = normalizeText(Object.values(record.respostas || {}).join(" "));
      return text.includes("tempo");
    }).length;

    return {
      total,
      negativeRichBeliefCount,
      averageTalentScore,
      keywordCounts,
      noInvestmentThoughtCount,
      lackOfTimeCount
    };
  }, [records]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError("");
      setAiReport("");

      const diagnosticsQuery = query(
        collection(db, "diagnosticos_financeiros"),
        orderBy("criadoEm", "desc")
      );

      const snapshot = await getDocs(diagnosticsQuery);

      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data()
      }));

      setRecords(data);
    } catch (err) {
      console.error(err);
      setError(
        "Erro ao carregar dados do Firestore. Verifique as regras de leitura da collection diagnosticos_financeiros."
      );
    } finally {
      setLoading(false);
    }
  };

  const generateChurchReport = async () => {
    try {
      setGenerating(true);
      setError("");

      const response = await fetch(`${API_BASE_URL}/api/church-report`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          stats,
          records: records.map((record) => ({
            respostas: record.respostas,
            diagnosticoInicial: record.diagnosticoInicial || ""
          }))
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || "Erro ao gerar relatório.");
      }

      setAiReport(data.report);
    } catch (err) {
      console.error(err);
      setAiReport(buildLocalReport(records, stats));
    } finally {
      setGenerating(false);
    }
  };

  const downloadReport = () => {
    const content = aiReport || buildLocalReport(records, stats);

    const blob = new Blob([content], {
      type: "text/plain;charset=utf-8"
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "relatorio-mente-prospera-igreja.txt";
    link.click();

    URL.revokeObjectURL(url);
  };

  return (
    <main className="app-shell">
      <div className="orb orb-one" />
      <div className="orb orb-two" />
      <div className="orb orb-three" />

      <section className="dashboard">
        <div className="dashboard-header glass-card">
          <div>
            <p className="eyebrow">Admin da Igreja</p>
            <h2>Relatório Geral</h2>
            <p className="muted">
              Resultado agregado da pesquisa Mente Próspera, sem expor nomes.
            </p>
          </div>

          <button className="primary-button" onClick={loadData} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="spin" size={18} />
                Carregando...
              </>
            ) : (
              <>
                <RefreshCw size={18} />
                Carregar dados
              </>
            )}
          </button>
        </div>

        {error && <p className="error-message">{error}</p>}

        <div className="report-grid">
          <article className="glass-card metric-card">
            <div className="metric-icon">
              <Users size={22} />
            </div>
            <p className="eyebrow">Participantes</p>
            <h3>{stats.total}</h3>
            <p>Total de pessoas que completaram o diagnóstico.</p>
          </article>

          <article className="glass-card metric-card">
            <div className="metric-icon">
              <Brain size={22} />
            </div>
            <p className="eyebrow">Crença sobre ricos</p>
            <h3>{stats.negativeRichBeliefCount}</h3>
            <p>Pessoas com alguma associação negativa sobre riqueza.</p>
          </article>

          <article className="glass-card metric-card">
            <div className="metric-icon">
              <BarChart3 size={22} />
            </div>
            <p className="eyebrow">Talentos enterrados</p>
            <h3>{stats.averageTalentScore || "N/A"}</h3>
            <p>Média geral da escala de 1 a 5.</p>
          </article>

          <article className="glass-card metric-card">
            <div className="metric-icon">
              <Church size={22} />
            </div>
            <p className="eyebrow">Nunca pensaram nisso</p>
            <h3>{stats.noInvestmentThoughtCount}</h3>
            <p>Pessoas que indicaram nunca ter pensado em investir.</p>
          </article>
        </div>

        <section className="glass-card report-card">
          <div className="card-header">
            <div>
              <p className="eyebrow">Palavras mais importantes</p>
              <h3>Leitura rápida das respostas</h3>
            </div>
          </div>

          <div className="keyword-grid">
            {stats.keywordCounts.map((item) => (
              <div className="keyword-pill" key={item.word}>
                <span>{item.word}</span>
                <strong>{item.count}</strong>
              </div>
            ))}
          </div>
        </section>

        <section className="glass-card report-card">
          <div className="card-header">
            <div>
              <p className="eyebrow">Relatório para apresentar</p>
              <h3>
                <FileText size={22} />
                Diagnóstico geral da igreja
              </h3>
            </div>
          </div>

          <div className="report-actions">
            <button
              className="primary-button"
              onClick={generateChurchReport}
              disabled={generating || records.length === 0}
            >
              {generating ? (
                <>
                  <Loader2 className="spin" size={18} />
                  Gerando...
                </>
              ) : (
                <>
                  <FileText size={18} />
                  Gerar relatório com IA
                </>
              )}
            </button>

            <button
              className="secondary-button"
              onClick={downloadReport}
              disabled={records.length === 0}
            >
              <Download size={18} />
              Baixar relatório
            </button>
          </div>

          <pre className="report-output">
            {aiReport ||
              (records.length > 0
                ? buildLocalReport(records, stats)
                : "Clique em “Carregar dados” para buscar os diagnósticos do Firestore.")}
          </pre>
        </section>
      </section>
    </main>
  );
}