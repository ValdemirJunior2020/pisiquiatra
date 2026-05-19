// frontend/src/App.js

import React, { useMemo, useRef, useState } from "react";
import {
  ArrowRight,
  BrainCircuit,
  CheckCircle2,
  Flame,
  LineChart,
  Loader2,
  MessageCircleHeart,
  PiggyBank,
  ShieldCheck,
  Sparkles,
  UserRound
} from "lucide-react";
import { db, collection, addDoc } from "./firebase";

const API_BASE_URL = process.env.REACT_APP_API_URL || "";

// frontend/src/App.js

// frontend/src/App.js

const questions = [
  {
    key: "visao_de_futuro",
    text: "Quando você imagina Deus te levando para uma vida mais frutífera, organizada e próspera, qual é o primeiro medo ou dúvida que aparece no seu coração?"
  },
  {
    key: "crenca_sobre_ricos",
    text: "Você já pensou, mesmo em silêncio, que pessoas com muito dinheiro geralmente são arrogantes, egoístas, gananciosas ou frias?"
  },
  {
    key: "medo_do_julgamento",
    text: "Se sua vida financeira melhorasse muito, o que você acha que sua família, comunidade ou igreja pensaria sobre você?"
  },
  {
    key: "talentos_parados",
    text: "Em uma escala de 1 a 5, quanto você sente que está deixando talentos, ideias, dons ou oportunidades paradas por medo, insegurança ou falta de direção?"
  },
  {
    key: "bloqueio_principal",
    text: "O que mais te impede hoje de crescer, aprender, organizar melhor sua vida financeira ou desenvolver algo que Deus colocou no seu coração?"
  },
  {
    key: "frase_sobre_dinheiro",
    text: "Qual frase sobre dinheiro, riqueza ou prosperidade você mais ouviu na família, na igreja ou na vida que ainda influencia sua mente hoje?"
  },
  {
    key: "sentimento_ao_prosperar",
    text: "Quando você imagina Deus te abençoando financeiramente de forma honesta, você sente paz, culpa, medo, dúvida ou empolgação? Explique."
  },
  {
    key: "area_travada",
    text: "Qual área da sua vida parece mais travada hoje: finanças, disciplina, fé, coragem, conhecimento, visão de futuro ou ação prática?"
  },
  {
    key: "imagem_de_deus",
    text: "Você acredita que Deus se agrada quando uma pessoa administra bem seus recursos, cresce com sabedoria e usa prosperidade para servir outras pessoas? Por quê?"
  },
  {
    key: "primeiro_passo",
    text: "Qual pequeno passo você poderia dar nos próximos 7 dias para sair da estagnação e começar a caminhar com mais sabedoria, fé e responsabilidade?"
  }
];

function buildLocalFallbackDiagnosis(name, answersMap) {
  return `Diagnóstico inicial de ${name}:

Você apresenta um padrão de bloqueio financeiro mais ligado ao medo de perda, falta de tempo e preocupação espiritual/social do que a uma rejeição real da prosperidade.

Seu medo principal parece ser: "${answersMap.medo_inicial || "não informado"}".

O ponto positivo é que você não demonstra odiar pessoas prósperas. Isso mostra que sua mente não está totalmente presa na crença de que dinheiro é mal. Porém, existe uma tensão entre prosperar, manter humildade e não ser mal interpretado pela comunidade.

Seu nível de talentos enterrados foi: "${answersMap.talentos_enterrados || "não informado"}".

Tratamento inicial do Dr. Nate:
Você não precisa idolatrar dinheiro. Você precisa parar de chamar medo de “prudência espiritual”. A parábola dos talentos não elogia quem enterrou recurso por medo. Ela confronta esse padrão. Seu próximo passo é simples: estudar com constância, começar pequeno, aprender gestão de risco e tratar prosperidade como mordomia, não como vaidade.

Pergunta para hoje:
Como foi o seu dia hoje? Onde você percebeu procrastinação, medo ou desculpa disfarçada de humildade?`;
}

function App() {
  const [step, setStep] = useState("welcome");
  const [fullName, setFullName] = useState("");
  const [nameSaving, setNameSaving] = useState(false);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [currentAnswer, setCurrentAnswer] = useState("");
  const [answers, setAnswers] = useState([]);
  const [diagnosisSaving, setDiagnosisSaving] = useState(false);
  const [diagnosisId, setDiagnosisId] = useState(null);
  const [diagnosisText, setDiagnosisText] = useState("");
  const [messages, setMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [error, setError] = useState("");
  const chatEndRef = useRef(null);

  const progress = useMemo(
    () => Math.round(((questionIndex + 1) / questions.length) * 100),
    [questionIndex]
  );

  const scrollToBottom = () => {
    setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: "smooth" }), 80);
  };

  const createAnswersMap = (answersArray) => {
    return questions.reduce((acc, question, index) => {
      acc[question.key] = answersArray[index] || "";
      return acc;
    }, {});
  };

  const saveUserName = async (event) => {
    event.preventDefault();
    setError("");

    const cleanName = fullName.trim();

    if (!cleanName) {
      setError("Digite seu nome completo para começar.");
      return;
    }

    try {
      setNameSaving(true);

      await addDoc(collection(db, "usuarios_terapia"), {
        nomeCompleto: cleanName,
        criadoEm: new Date().toISOString(),
        origem: "Mente Próspera"
      });

      setStep("onboarding");
    } catch (err) {
      console.error(err);
      setError("Não consegui salvar seu nome no Firebase. Verifique as regras do Firestore.");
    } finally {
      setNameSaving(false);
    }
  };

  const generateDiagnosis = async (answersMap) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/diagnosis`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          name: fullName.trim(),
          questions,
          answers: answersMap
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || "Erro ao gerar diagnóstico.");
      }

      return data.diagnosis;
    } catch (err) {
      console.error("Diagnosis API failed. Using fallback:", err);
      return buildLocalFallbackDiagnosis(fullName.trim(), answersMap);
    }
  };

  const saveAnswer = async (event) => {
    event.preventDefault();
    setError("");

    const cleanAnswer = currentAnswer.trim();

    if (!cleanAnswer) {
      setError("Responda antes de continuar.");
      return;
    }

    const nextAnswers = [...answers, cleanAnswer];

    if (questionIndex < questions.length - 1) {
      setAnswers(nextAnswers);
      setCurrentAnswer("");
      setQuestionIndex((prev) => prev + 1);
      return;
    }

    try {
      setDiagnosisSaving(true);

      const answersMap = createAnswersMap(nextAnswers);
      const generatedDiagnosis = await generateDiagnosis(answersMap);

      const diagnosticPayload = {
        nomeCompleto: fullName.trim(),
        perguntas: questions.map((item) => item.text),
        respostas: answersMap,
        diagnosticoInicial: generatedDiagnosis,
        criadoEm: new Date().toISOString(),
        status: "completed"
      };

      const docRef = await addDoc(
        collection(db, "diagnosticos_financeiros"),
        diagnosticPayload
      );

      setAnswers(nextAnswers);
      setDiagnosisId(docRef.id);
      setDiagnosisText(generatedDiagnosis);

      const assistantStart = {
        role: "assistant",
        content: generatedDiagnosis,
        createdAt: new Date().toISOString()
      };

      setMessages([assistantStart]);
      setStep("dashboard");
      scrollToBottom();
    } catch (err) {
      console.error(err);
      setError("Não consegui salvar seu diagnóstico no Firebase. Verifique as regras do Firestore.");
    } finally {
      setDiagnosisSaving(false);
    }
  };

  const sendChatMessage = async (event) => {
    event.preventDefault();
    setError("");

    const cleanInput = chatInput.trim();

    if (!cleanInput || chatLoading) {
      return;
    }

    const userMessage = {
      role: "user",
      content: cleanInput,
      createdAt: new Date().toISOString()
    };

    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setChatInput("");
    setChatLoading(true);
    scrollToBottom();

    try {
      const answersMap = createAnswersMap(answers);

      const response = await fetch(`${API_BASE_URL}/api/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          name: fullName.trim(),
          diagnosisId,
          diagnosisText,
          diagnosis: {
            questions,
            answers: answersMap
          },
          messages: nextMessages.map(({ role, content }) => ({ role, content }))
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || "Erro ao chamar o servidor.");
      }

      const assistantMessage = {
        role: "assistant",
        content: data.reply,
        createdAt: new Date().toISOString()
      };

      setMessages((prev) => [...prev, assistantMessage]);
      scrollToBottom();
    } catch (err) {
      console.error(err);
      setError(
        err.message ||
          "Não consegui falar com o Dr. Nate agora. Confirme se o backend está rodando."
      );
    } finally {
      setChatLoading(false);
    }
  };

  return (
    <main className="app-shell">
      <div className="orb orb-one" />
      <div className="orb orb-two" />
      <div className="orb orb-three" />

      <section className="hero-bar">
        <div className="brand-mark">
          <BrainCircuit size={22} />
        </div>
        <div>
          <p className="eyebrow">Mente Próspera</p>
          <h1>Dr. Nate Therapy OS</h1>
        </div>
      </section>

      {step === "welcome" && (
        <section className="screen-center">
          <div className="glass-card welcome-card">
            <div className="icon-pill">
              <Sparkles size={18} />
              Terapia, fé e neurociência financeira
            </div>

            <h2>Vamos começar com seu nome.</h2>
            <p className="muted">
              Seu diagnóstico será salvo com segurança no Firestore para o Dr. Nate entender
              seu padrão de medo, procrastinação e propósito.
            </p>

            <form onSubmit={saveUserName} className="form-stack">
              <label htmlFor="fullName">Nome completo</label>
              <div className="input-wrap">
                <UserRound size={18} />
                <input
                  id="fullName"
                  type="text"
                  value={fullName}
                  onChange={(event) => setFullName(event.target.value)}
                  placeholder="Digite seu nome completo"
                  autoComplete="name"
                />
              </div>

              {error && <p className="error-message">{error}</p>}

              <button className="primary-button" type="submit" disabled={nameSaving}>
                {nameSaving ? (
                  <>
                    <Loader2 className="spin" size={18} />
                    Salvando...
                  </>
                ) : (
                  <>
                    Começar diagnóstico
                    <ArrowRight size={18} />
                  </>
                )}
              </button>
            </form>
          </div>
        </section>
      )}

      {step === "onboarding" && (
        <section className="screen-center">
          <div className="glass-card question-card">
            <div className="question-topline">
              <span>
                Pergunta {questionIndex + 1} de {questions.length}
              </span>
              <strong>{progress}%</strong>
            </div>

            <div className="progress-track">
              <div className="progress-fill" style={{ width: `${progress}%` }} />
            </div>

            <h2>{questions[questionIndex].text}</h2>

            <form onSubmit={saveAnswer} className="form-stack">
              <label htmlFor="answer">Sua resposta</label>
              <textarea
                id="answer"
                value={currentAnswer}
                onChange={(event) => setCurrentAnswer(event.target.value)}
                placeholder="Responda com honestidade. Sem máscara religiosa, sem pose, sem teatro..."
                rows={6}
              />

              {error && <p className="error-message">{error}</p>}

              <button className="primary-button" type="submit" disabled={diagnosisSaving}>
                {diagnosisSaving ? (
                  <>
                    <Loader2 className="spin" size={18} />
                    Gerando diagnóstico...
                  </>
                ) : questionIndex === questions.length - 1 ? (
                  <>
                    Gerar meu diagnóstico
                    <CheckCircle2 size={18} />
                  </>
                ) : (
                  <>
                    Próxima pergunta
                    <ArrowRight size={18} />
                  </>
                )}
              </button>
            </form>
          </div>
        </section>
      )}

      {step === "dashboard" && (
        <section className="dashboard">
          <div className="dashboard-header glass-card">
            <div>
              <p className="eyebrow">Diagnóstico imediato</p>
              <h2>Bem-vindo, {fullName.trim().split(" ")[0]}.</h2>
              <p className="muted">
                Seu diagnóstico já foi gerado e salvo. Agora o Dr. Nate continua o
                acompanhamento diário.
              </p>
            </div>
            <div className="status-chip">
              <ShieldCheck size={16} />
              Diagnóstico salvo
            </div>
          </div>

          <div className="bento-grid">
            <article className="glass-card chat-card">
              <div className="card-header">
                <div>
                  <p className="eyebrow">Sessão com IA</p>
                  <h3>
                    <MessageCircleHeart size={22} />
                    Dr. Nate
                  </h3>
                </div>
                <span className="live-dot">online</span>
              </div>

              <div className="chat-window">
                {messages.map((message, index) => (
                  <div
                    className={`message-row ${
                      message.role === "user" ? "message-user" : "message-assistant"
                    }`}
                    key={`${message.role}-${index}-${message.createdAt}`}
                  >
                    <div className="message-bubble">
                      <p>{message.content}</p>
                    </div>
                  </div>
                ))}

                {chatLoading && (
                  <div className="message-row message-assistant">
                    <div className="message-bubble typing">
                      <Loader2 className="spin" size={16} />
                      Dr. Nate está preparando uma exortação terapêutica...
                    </div>
                  </div>
                )}

                <div ref={chatEndRef} />
              </div>

              <form onSubmit={sendChatMessage} className="chat-form">
                <input
                  value={chatInput}
                  onChange={(event) => setChatInput(event.target.value)}
                  placeholder="Conte como foi seu dia hoje..."
                />
                <button type="submit" disabled={chatLoading || !chatInput.trim()}>
                  <ArrowRight size={18} />
                </button>
              </form>

              {error && <p className="error-message">{error}</p>}
            </article>

            <article className="glass-card metric-card">
              <div className="metric-icon">
                <Flame size={22} />
              </div>
              <p className="eyebrow">Medo principal</p>
              <h3>Raiz emocional</h3>
              <p>{createAnswersMap(answers).medo_inicial}</p>
            </article>

            <article className="glass-card metric-card">
              <div className="metric-icon">
                <PiggyBank size={22} />
              </div>
              <p className="eyebrow">Crença sobre riqueza</p>
              <h3>Dinheiro amplifica o coração</h3>
              <p>{createAnswersMap(answers).crenca_sobre_ricos}</p>
            </article>

            <article className="glass-card metric-card wide-mobile">
              <div className="metric-icon">
                <LineChart size={22} />
              </div>
              <p className="eyebrow">Talentos financeiros</p>
              <h3>Escala: {createAnswersMap(answers).talentos_enterrados}</h3>
              <p>
                A meta não é idolatrar dinheiro. É parar de usar falsa humildade como
                cobertor para medo.
              </p>
            </article>
          </div>
        </section>
      )}
    </main>
  );
}

export default App;