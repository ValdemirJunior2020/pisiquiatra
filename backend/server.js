// backend/server.js

require("dotenv").config();

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const OpenAI = require("openai");

const app = express();
const PORT = process.env.PORT || 5000;

const allowedOrigins = [
  "http://localhost:3000",
  "http://localhost:5173",
  process.env.CLIENT_URL
].filter(Boolean);

app.use(
  helmet({
    crossOriginResourcePolicy: false
  })
);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error("Not allowed by CORS"));
    },
    credentials: true
  })
);

app.use(express.json({ limit: "1mb" }));

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const CHAT_TOKEN_LIMIT = Number(process.env.CHAT_TOKEN_LIMIT || 350);
const DIAGNOSIS_TOKEN_LIMIT = Number(process.env.DIAGNOSIS_TOKEN_LIMIT || 600);
const REPORT_TOKEN_LIMIT = Number(process.env.REPORT_TOKEN_LIMIT || 900);
const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-4";

const SYSTEM_PROMPT = `You are Dr. Natanael Silva (Dr. Nate), a Christian psychiatrist, elite neuroscientist, and expert in human purpose. Blend real neuroscience (amygdala, dopamine, cortisol) with biblical truths (Parable of the Talents, Proverbs). Use sharp, stand-up comedy humor to destroy 'spiritual' excuses for laziness and fear of investing. Destroy the false humility that 'money corrupts' by proving money amplifies the heart. If the user is paralyzed by fear, give them a comedic 'spiritual scolding' but end by empowering them to reign and prosper. Ask about their day, fish for triggers of procrastination or victimhood, and apply this treatment.

Safety rules:
- You are coaching and spiritual encouragement, not a replacement for licensed medical care.
- Do not diagnose medical conditions.
- If the user mentions self-harm, suicide, abuse, psychosis, or immediate danger, respond with compassion and urge immediate emergency help or crisis support.
- Do not give guaranteed financial returns or personalized investment instructions.
- Encourage studying, budgeting, stewardship, counsel, and wise risk management.
- Keep answers practical, warm, funny, direct, and empowering.
- Keep chat answers concise unless the user asks for depth.`;

const DIAGNOSIS_PROMPT = `You are Dr. Natanael Silva, also known as Dr. Nate.

Create an immediate financial/spiritual mindset diagnosis in Portuguese based on the user's answers.

Tone:
- Christian
- neuroscientific
- funny but serious
- direct
- empowering
- premium therapy/coaching style

Do not sound generic.
Do not just repeat the answers.
Do not make medical claims.
Do not promise investment results.
Do not tell the user exactly what stock or asset to buy.

Your diagnosis must include:

1. Diagnóstico Principal
Explain the user's main mental/spiritual block.

2. Raiz Emocional
Identify fear, shame, false humility, fear of judgment, procrastination, or scarcity mindset.

3. Leitura Neurocientífica
Mention amygdala, cortisol, dopamine, habit loop, or avoidance behavior in a simple way.

4. Leitura Bíblica
Use biblical wisdom such as Parable of the Talents, Proverbs, stewardship, diligence, wisdom, or purpose.

5. Correção do Dr. Nate
Give a comedic but loving correction.

6. Plano dos Próximos 7 Dias
Give 3 practical steps:
- one study step
- one money organization step
- one courage/action step

7. End with this exact question:
"Agora me diga: Como foi o seu dia hoje?"`;

function buildDiagnosisSummary(diagnosis) {
  if (!diagnosis) {
    return "No diagnostic answers were provided.";
  }

  if (diagnosis.answers && !Array.isArray(diagnosis.answers)) {
    return Object.entries(diagnosis.answers)
      .map(([key, value]) => `${key}: ${value || "No answer"}`)
      .join("\n");
  }

  if (Array.isArray(diagnosis.questions) && Array.isArray(diagnosis.answers)) {
    return diagnosis.questions
      .map((question, index) => {
        const questionText = typeof question === "string" ? question : question.text;

        return `Q${index + 1}: ${questionText}\nA${index + 1}: ${
          diagnosis.answers[index] || "No answer"
        }`;
      })
      .join("\n\n");
  }

  return "No diagnostic answers were provided.";
}

app.get("/", (_req, res) => {
  res.json({
    ok: true,
    app: "Mente Próspera API",
    status: "running"
  });
});

app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    message: "Mente Próspera backend is healthy."
  });
});

app.post("/api/diagnosis", async (req, res) => {
  try {
    const { name, questions, answers } = req.body;

    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({
        error: "OPENAI_API_KEY is missing on the backend server."
      });
    }

    if (!answers || typeof answers !== "object") {
      return res.status(400).json({
        error: "Answers are required to generate diagnosis."
      });
    }

    const diagnosisInput = Object.entries(answers)
      .map(([key, value]) => `${key}: ${value}`)
      .join("\n");

    const questionInput = Array.isArray(questions)
      ? questions
          .map((question, index) => {
            const questionText = typeof question === "string" ? question : question.text;
            return `${index + 1}. ${questionText}`;
          })
          .join("\n")
      : "";

    const completion = await openai.chat.completions.create({
      model: OPENAI_MODEL,
      temperature: 0.85,
      max_tokens: DIAGNOSIS_TOKEN_LIMIT,
      messages: [
        {
          role: "system",
          content: DIAGNOSIS_PROMPT
        },
        {
          role: "user",
          content: `Nome do usuário: ${name || "Usuário"}

Perguntas feitas:
${questionInput}

Respostas do usuário:
${diagnosisInput}

Gere agora o diagnóstico inicial completo em português.`
        }
      ]
    });

    const diagnosis =
      completion.choices?.[0]?.message?.content ||
      "Não consegui gerar o diagnóstico agora. Mas já identifiquei um padrão de medo financeiro que precisa ser confrontado com sabedoria, estudo e ação.";

    res.json({ diagnosis });
  } catch (error) {
    console.error("Diagnosis error:", error);

    res.status(500).json({
      error:
        error?.message ||
        "The AI diagnosis service failed. Check your backend logs and OPENAI_API_KEY."
    });
  }
});

app.post("/api/church-report", async (req, res) => {
  try {
    const { stats, records } = req.body;

    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({
        error: "OPENAI_API_KEY is missing on the backend server."
      });
    }

    if (!Array.isArray(records)) {
      return res.status(400).json({
        error: "Records are required."
      });
    }

    const safeRecords = records.slice(0, 150);

    const completion = await openai.chat.completions.create({
      model: OPENAI_MODEL,
      temperature: 0.7,
      max_tokens: REPORT_TOKEN_LIMIT,
      messages: [
        {
          role: "system",
          content: `Você é Dr. Nate, um psiquiatra cristão, neurocientista e comunicador estratégico.

Gere um relatório geral em português para ser apresentado a uma igreja com base em respostas agregadas de uma pesquisa sobre prosperidade, medo financeiro, investimento, mordomia e crenças espirituais sobre dinheiro.

Regras:
- Não exponha nomes.
- Não cite respostas individuais de forma que identifique alguém.
- Seja pastoral, claro, forte e respeitoso.
- Use linguagem cristã, mas também prática.
- Inclua Parábola dos Talentos, Provérbios, mordomia e sabedoria.
- Inclua leitura emocional/neurocientífica simples: medo, amígdala, cortisol, evitação e hábitos.
- Inclua plano de ação para a igreja.
- Não dê recomendação específica de investimento.
- Formato pronto para apresentar em reunião.
- Seja objetivo.`
        },
        {
          role: "user",
          content: `Estatísticas gerais:
${JSON.stringify(stats, null, 2)}

Dados agregados dos diagnósticos:
${JSON.stringify(safeRecords, null, 2)}

Gere um relatório geral para apresentar para a igreja.`
        }
      ]
    });

    const report =
      completion.choices?.[0]?.message?.content ||
      "Não consegui gerar o relatório agora.";

    res.json({ report });
  } catch (error) {
    console.error("Church report error:", error);

    res.status(500).json({
      error: error?.message || "Erro ao gerar relatório geral da igreja."
    });
  }
});

app.post("/api/chat", async (req, res) => {
  try {
    const { name, diagnosis, diagnosisText, messages } = req.body;

    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({
        error: "OPENAI_API_KEY is missing on the backend server."
      });
    }

    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({
        error: "Messages are required."
      });
    }

    const safeMessages = messages
      .filter(
        (message) =>
          message &&
          ["user", "assistant"].includes(message.role) &&
          message.content
      )
      .slice(-6)
      .map((message) => ({
        role: message.role,
        content: String(message.content).slice(0, 1500)
      }));

    const diagnosisSummary = buildDiagnosisSummary(diagnosis);

    const completion = await openai.chat.completions.create({
      model: OPENAI_MODEL,
      temperature: 0.8,
      max_tokens: CHAT_TOKEN_LIMIT,
      messages: [
        {
          role: "system",
          content: SYSTEM_PROMPT
        },
        {
          role: "system",
          content: `User name: ${name || "Unknown"}

Initial diagnosis:
${diagnosisText || "No initial diagnosis text saved."}

Financial/spiritual diagnostic answers:
${diagnosisSummary}`
        },
        ...safeMessages
      ]
    });

    const reply =
      completion.choices?.[0]?.message?.content ||
      "Eu ouvi você. Respira. Agora vamos separar medo real de desculpa com roupa de humildade.";

    res.json({ reply });
  } catch (error) {
    console.error("OpenAI chat error:", error);

    res.status(500).json({
      error:
        error?.message ||
        "The AI service failed. Check your backend logs and OPENAI_API_KEY."
    });
  }
});

app.use((err, _req, res, _next) => {
  console.error("Server error:", err);

  res.status(500).json({
    error: err.message || "Unexpected server error."
  });
});

app.listen(PORT, () => {
  console.log(`Mente Próspera backend running on port ${PORT}`);
});