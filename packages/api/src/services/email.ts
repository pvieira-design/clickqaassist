import { Resend } from "resend";
import { env } from "@clickqaassist/env/server";

const resend = new Resend(env.RESEND_API_KEY);

const FROM_EMAIL = "Click QA <noreply@clickcannabis.com>";

export async function sendFeedbackNotification(params: {
  agentEmail: string;
  agentName: string;
  feedbackTypeName: string;
  category: string;
  points: number;
  comment?: string | null;
  evaluatorName: string;
}) {
  const pointsStr =
    params.points > 0 ? `+${params.points}` : String(params.points);
  const categoryPtBR =
    params.category === "POSITIVE"
      ? "Positivo"
      : params.category === "NEUTRAL"
        ? "Neutro"
        : "Negativo";

  await resend.emails.send({
    from: FROM_EMAIL,
    to: params.agentEmail,
    subject: `Novo Feedback: ${params.feedbackTypeName} (${pointsStr})`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1a1a1a;">Novo Feedback Recebido</h2>
        <p>Olá <strong>${params.agentName}</strong>,</p>
        <p>Você recebeu um novo feedback:</p>
        <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
          <tr>
            <td style="padding: 8px; border: 1px solid #e5e5e5; font-weight: bold;">Tipo</td>
            <td style="padding: 8px; border: 1px solid #e5e5e5;">${params.feedbackTypeName}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border: 1px solid #e5e5e5; font-weight: bold;">Categoria</td>
            <td style="padding: 8px; border: 1px solid #e5e5e5;">${categoryPtBR}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border: 1px solid #e5e5e5; font-weight: bold;">Pontos</td>
            <td style="padding: 8px; border: 1px solid #e5e5e5;">${pointsStr}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border: 1px solid #e5e5e5; font-weight: bold;">Avaliador</td>
            <td style="padding: 8px; border: 1px solid #e5e5e5;">${params.evaluatorName}</td>
          </tr>
          ${params.comment ? `<tr>
            <td style="padding: 8px; border: 1px solid #e5e5e5; font-weight: bold;">Comentário</td>
            <td style="padding: 8px; border: 1px solid #e5e5e5;">${params.comment}</td>
          </tr>` : ""}
        </table>
        <p>Acesse o sistema para visualizar e responder ao feedback.</p>
        <p style="color: #666; font-size: 12px;">Click QA Assistant - Click Cannabis</p>
      </div>
    `,
  });
}

export async function sendContestationNotification(params: {
  leaderEmail: string;
  leaderName: string;
  agentName: string;
  feedbackTypeName: string;
  contestationMessage: string;
}) {
  await resend.emails.send({
    from: FROM_EMAIL,
    to: params.leaderEmail,
    subject: `Contestação: ${params.agentName} contestou "${params.feedbackTypeName}"`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1a1a1a;">Nova Contestação</h2>
        <p>Olá <strong>${params.leaderName}</strong>,</p>
        <p>O atendente <strong>${params.agentName}</strong> contestou um feedback:</p>
        <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
          <tr>
            <td style="padding: 8px; border: 1px solid #e5e5e5; font-weight: bold;">Feedback</td>
            <td style="padding: 8px; border: 1px solid #e5e5e5;">${params.feedbackTypeName}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border: 1px solid #e5e5e5; font-weight: bold;">Motivo</td>
            <td style="padding: 8px; border: 1px solid #e5e5e5;">${params.contestationMessage}</td>
          </tr>
        </table>
        <p>Acesse o sistema para analisar e resolver a contestação.</p>
        <p style="color: #666; font-size: 12px;">Click QA Assistant - Click Cannabis</p>
      </div>
    `,
  });
}

export async function sendResolutionNotification(params: {
  agentEmail: string;
  agentName: string;
  feedbackTypeName: string;
  resolution: string;
}) {
  const resolutionPtBR =
    params.resolution === "MAINTAINED"
      ? "mantido"
      : params.resolution === "CHANGED"
        ? "alterado"
        : "removido";

  await resend.emails.send({
    from: FROM_EMAIL,
    to: params.agentEmail,
    subject: `Contestação Resolvida: Feedback ${resolutionPtBR}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1a1a1a;">Contestação Resolvida</h2>
        <p>Olá <strong>${params.agentName}</strong>,</p>
        <p>Sua contestação sobre o feedback <strong>"${params.feedbackTypeName}"</strong> foi analisada.</p>
        <p><strong>Resultado:</strong> Feedback ${resolutionPtBR}</p>
        <p>Acesse o sistema para mais detalhes.</p>
        <p style="color: #666; font-size: 12px;">Click QA Assistant - Click Cannabis</p>
      </div>
    `,
  });
}
