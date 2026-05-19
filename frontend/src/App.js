

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
import { translations } from "./i18n";

const API_BASE_URL = process.env.REACT_APP_API_URL || "";
const MAX_CHAT_MESSAGES = 6;

function buildLocalFallbackDiagnosis(name, answersMap, language) {
  if (language === "en") {
    return `Initial diagnosis for ${name}:

Your answers show that God may be highlighting areas of growth, stewardship, courage, and responsibility in your life.

Main block:
Your strongest block appears to be connected to fear, uncertainty, lack of direction, or hesitation around financial growth and purpose.

Where the blocks may be:
- Fear of growing and being misunderstood
- Uncertainty about money and prosperity
- Possible false beliefs about wealth
- Delayed action because of fear or lack of clarity

Biblical encouragement:
God does not expose a block to shame you. He reveals it to heal it, mature you, and move you forward. The Parable of the Talents teaches that fear should not bury what God placed in your hands.

Dr. Nate correction:
This is not the season to call fear humility. Sometimes fear wears church clothes and still needs deliverance from procrastination.

Next 7 days:
1. Pray and ask God for wisdom and courage.
2. Learn one basic lesson about stewardship or financial organization.
3. Take one small practical step with what God already gave you.

Now tell me: How was your day today?`;
  }

  return `Diagnóstico inicial de ${name}:

Suas respostas mostram que o Senhor pode estar destacando áreas de crescimento, mordomia, coragem e responsabilidade na sua vida.

Bloqueio principal:
O bloqueio mais forte parece estar ligado a medo, dúvida, falta de direção ou hesitação em relação ao crescimento financeiro e ao propósito.

Onde podem estar os bloqueios:
- Medo de crescer e ser mal interpretado
- Insegurança sobre dinheiro e prosperidade
- Possíveis crenças distorcidas sobre riqueza
- Ação adiada por medo ou falta de clareza

Encorajamento bíblico:
Deus não revela um bloqueio para te envergonhar. Ele revela para curar, amadurecer e te mover para frente. A Parábola dos Talentos mostra que medo não deve enterrar aquilo que Deus colocou nas suas mãos.

Correção do Dr. Nate:
Essa não é a estação de chamar medo de humildade. Às vezes o medo veste roupa de culto e ainda precisa ser liberto da procrastinação.

Próximos 7 dias:
1. Ore pedindo sabedoria e coragem.
2. Aprenda uma lição básica sobre mordomia ou organização financeira.
3. Dê um pequeno passo prático com aquilo que Deus já colocou nas suas mãos.

Agora me diga: Como foi o seu dia hoje?`;
}

function App() {
  const [language, setLanguage] = useState(
    localStorage.getItem("menteProsperaLanguage") || "pt"
  );

  const t = translations[language] || translations.pt;
  const questions = t.questions;

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

  const progress = useMemo(() => {
    return Math.round(((questionIndex + 1) / questions.length) * 100);
  }, [questionIndex, questions.length]);

  const toggleLanguage = () => {
    const nextLanguage = language === "pt" ? "en" : "pt";
    setLanguage(nextLanguage);
    localStorage.setItem("menteProsperaLanguage", nextLanguage);
    setQuestionIndex(0);
    setCurrentAnswer("");
    setAnswers([]);
    setDiagnosisText("");
    setMessages([]);
    setError("");
    setStep("welcome");
  };

  const scrollToBottom = () => {
    setTimeout(() => {
      chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 80);
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
      setError(t.nameRequired);
      return;
    }

    try {
      setNameSaving(true);

      await addDoc(collection(db, "usuarios_terapia"), {
        nomeCompleto: cleanName,
        idioma: language,
        criadoEm: new Date().toISOString(),
        origem: "Mente Próspera"
      });

      setStep("onboarding");
    } catch (err) {
      console.error(err);
      setError(t.firebaseNameError);
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
          language,
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
      return buildLocalFallbackDiagnosis(fullName.trim(), answersMap, language);
    }
  };

  const saveAnswer = async (event) => {
    event.preventDefault();
    setError("");

    const cleanAnswer = currentAnswer.trim();

    if (!cleanAnswer) {
      setError(t.answerRequired);
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
        idioma: language,
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

      setMessages([
        {
          role: "assistant",
          content: generatedDiagnosis,
          createdAt: new Date().toISOString()
        }
      ]);

      setStep("dashboard");
      scrollToBottom();
    } catch (err) {
      console.error(err);
      setError(t.firebaseDiagnosisError);
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

    const nextMessages = [...messages, userMessage].slice(-MAX_CHAT_MESSAGES);

    setMessages((prev) => [...prev, userMessage]);
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
          language,
          diagnosisId,
          diagnosisText,
          diagnosis: {
            questions,
            answers: answersMap
          },
          messages: nextMessages.map(({ role, content }) => ({
            role,
            content
          }))
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

      setMessages((prev) => [...prev, assistantMessage].slice(-20));
      scrollToBottom();
    } catch (err) {
      console.error(err);
      setError(t.chatError);
    } finally {
      setChatLoading(false);
    }
  };

  const answersMap = createAnswersMap(answers);

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
          <p className="eyebrow">{t.appName}</p>
          <h1>{t.appSubtitle}</h1>
        </div>

        <button className="language-button" type="button" onClick={toggleLanguage}>
          {t.otherLanguage}
        </button>
      </section>

      {step === "welcome" && (
        <section className="screen-center">
          <div className="glass-card welcome-card">
            <div className="icon-pill">
              <Sparkles size={18} />
              {t.welcomePill}
            </div>

            <h2>{t.welcomeTitle}</h2>
            <p className="muted">{t.welcomeText}</p>

            <form onSubmit={saveUserName} className="form-stack">
              <label htmlFor="fullName">{t.fullName}</label>

              <div className="input-wrap">
                <UserRound size={18} />
                <input
                  id="fullName"
                  type="text"
                  value={fullName}
                  onChange={(event) => setFullName(event.target.value)}
                  placeholder={t.fullNamePlaceholder}
                  autoComplete="name"
                />
              </div>

              {error && <p className="error-message">{error}</p>}

              <button className="primary-button" type="submit" disabled={nameSaving}>
                {nameSaving ? (
                  <>
                    <Loader2 className="spin" size={18} />
                    {t.saving}
                  </>
                ) : (
                  <>
                    {t.startDiagnosis}
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
                {t.question} {questionIndex + 1} {t.of} {questions.length}
              </span>
              <strong>{progress}%</strong>
            </div>

            <div className="progress-track">
              <div className="progress-fill" style={{ width: `${progress}%` }} />
            </div>

            <h2>{questions[questionIndex].text}</h2>

            <form onSubmit={saveAnswer} className="form-stack">
              <label htmlFor="answer">{t.answerLabel}</label>

              <textarea
                id="answer"
                value={currentAnswer}
                onChange={(event) => setCurrentAnswer(event.target.value)}
                placeholder={t.answerPlaceholder}
                rows={6}
              />

              {error && <p className="error-message">{error}</p>}

              <button className="primary-button" type="submit" disabled={diagnosisSaving}>
                {diagnosisSaving ? (
                  <>
                    <Loader2 className="spin" size={18} />
                    {t.generatingDiagnosis}
                  </>
                ) : questionIndex === questions.length - 1 ? (
                  <>
                    {t.generateDiagnosis}
                    <CheckCircle2 size={18} />
                  </>
                ) : (
                  <>
                    {t.nextQuestion}
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
              <p className="eyebrow">{t.dashboardEyebrow}</p>
              <h2>
                {t.welcomeBack}, {fullName.trim().split(" ")[0]}.
              </h2>
              <p className="muted">{t.dashboardText}</p>
            </div>

            <div className="status-chip">
              <ShieldCheck size={16} />
              {t.diagnosisSaved}
            </div>
          </div>

          <div className="bento-grid">
            <article className="glass-card chat-card">
              <div className="card-header">
                <div>
                  <p className="eyebrow">{t.sessionWithAi}</p>
                  <h3>
                    <MessageCircleHeart size={22} />
                    Dr. Nate
                  </h3>
                </div>

                <span className="live-dot">{t.online}</span>
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
                      {t.typing}
                    </div>
                  </div>
                )}

                <div ref={chatEndRef} />
              </div>

              <form onSubmit={sendChatMessage} className="chat-form">
                <input
                  value={chatInput}
                  onChange={(event) => setChatInput(event.target.value)}
                  placeholder={t.chatPlaceholder}
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
              <p className="eyebrow">{t.mainFear}</p>
              <h3>{t.emotionalRoot}</h3>
              <p>{answersMap.visao_de_futuro || answersMap.medo_inicial}</p>
            </article>

            <article className="glass-card metric-card">
              <div className="metric-icon">
                <PiggyBank size={22} />
              </div>
              <p className="eyebrow">{t.richBelief}</p>
              <h3>{t.moneyAmplifies}</h3>
              <p>{answersMap.crenca_sobre_ricos}</p>
            </article>

            <article className="glass-card metric-card wide-mobile">
              <div className="metric-icon">
                <LineChart size={22} />
              </div>
              <p className="eyebrow">{t.financialTalents}</p>
              <h3>
                {t.scale}: {answersMap.talentos_parados || answersMap.talentos_enterrados}
              </h3>
              <p>{t.goalText}</p>
            </article>
          </div>
        </section>
      )}
    </main>
  );
}

export default App;