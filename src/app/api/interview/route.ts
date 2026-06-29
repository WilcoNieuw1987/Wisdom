import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export type InterviewMessage =
  | { role: "assistant"; type: "question"; text: string; choices?: string[] }
  | { role: "user"; answer: string };

export type InterviewRequest = {
  noteId: string;
  title: string;
  content: string;
  history: InterviewMessage[];
};

export type InterviewResponse =
  | { status: "question"; text: string; choices?: string[] }
  | { status: "done"; enrichedTitle: string; enrichedContent: string };

export async function POST(req: Request) {
  const body: InterviewRequest = await req.json();
  const { title, content, history } = body;

  const systemPrompt = `Je bent een scherpe denk-partner die helpt om werkideeën uit te werken.
Je taak: stel gerichte vragen om het idee concreter te maken, totdat je genoeg weet om het te verrijken.

Na maximaal 4 vragen (of eerder als je genoeg weet), schrijf je een verrijkte versie van het idee.

Regels voor vragen:
- Maximaal 4 vragen totaal
- Wissel meerkeuze en open vragen af
- Meerkeuze: geef 3-4 concrete opties
- Stel één vraag tegelijk
- Vragen gaan over: wat is het doel, wie profiteert ervan, wat is de belemmering, hoe groot is de impact

Geef altijd geldig JSON terug (geen markdown):

Als je nog een vraag hebt:
{"status": "question", "text": "je vraag", "choices": ["optie 1", "optie 2", "optie 3"]}

Voor open vraag, laat "choices" weg:
{"status": "question", "text": "je vraag"}

Als je genoeg weet (na antwoorden of als het idee al uitgewerkt genoeg is):
{"status": "done", "enrichedTitle": "scherpe titel", "enrichedContent": "uitgewerkte inhoud in 3-5 zinnen"}`;

  // Bouw de conversatiegeschiedenis op
  const messages: Anthropic.MessageParam[] = [
    {
      role: "user",
      content: `Idee om uit te werken:\nTitel: ${title}\nInhoud: ${content || "(leeg)"}`,
    },
  ];

  for (const msg of history) {
    if (msg.role === "assistant") {
      messages.push({
        role: "assistant",
        content: JSON.stringify(
          msg.choices
            ? { status: "question", text: msg.text, choices: msg.choices }
            : { status: "question", text: msg.text }
        ),
      });
    } else {
      messages.push({ role: "user", content: msg.answer });
    }
  }

  const response = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 512,
    system: systemPrompt,
    messages,
  });

  const text =
    response.content[0].type === "text" ? response.content[0].text : "{}";

  try {
    const json = text.match(/\{[\s\S]*\}/)?.[0];
    if (!json) throw new Error("no json");
    const parsed: InterviewResponse = JSON.parse(json);
    return NextResponse.json(parsed);
  } catch {
    return NextResponse.json({
      status: "question",
      text: "Kun je meer vertellen over het doel van dit idee?",
    });
  }
}
