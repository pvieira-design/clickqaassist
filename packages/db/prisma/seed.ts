import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "./generated/client.js";
import { hashPassword } from "better-auth/crypto";
import dotenv from "dotenv";
import crypto from "node:crypto";

dotenv.config({ path: "../../apps/web/.env" });

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) throw new Error("DATABASE_URL is not set");

const adapter = new PrismaPg({ connectionString: DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const DEPARTMENTS = [
  "Atendimento Inicial",
  "Consulta Médica",
  "Receita & Orçamento",
  "Documentação",
  "Pós-Venda",
] as const;

const FEEDBACK_TYPES = [
  // ── Positivos ──
  { name: "Boa pronúncia no áudio", category: "POSITIVE" as const, points: 5 },
  { name: "Usou script correto", category: "POSITIVE" as const, points: 3 },
  { name: "Resposta rápida", category: "POSITIVE" as const, points: 2 },
  { name: "Empatia demonstrada", category: "POSITIVE" as const, points: 3 },
  { name: "Excelente rapport com paciente", category: "POSITIVE" as const, points: 5 },
  { name: "Resposta clara e objetiva", category: "POSITIVE" as const, points: 3 },
  { name: "Boa condução de objeção", category: "POSITIVE" as const, points: 4 },
  { name: "Proatividade no atendimento", category: "POSITIVE" as const, points: 4 },
  { name: "Resolução rápida e eficiente", category: "POSITIVE" as const, points: 4 },
  { name: "Uso correto de protocolo", category: "POSITIVE" as const, points: 3 },
  { name: "Boa personalização da mensagem", category: "POSITIVE" as const, points: 3 },
  { name: "Empatia destacada", category: "POSITIVE" as const, points: 4 },
  { name: "Boa recuperação de paciente inativo", category: "POSITIVE" as const, points: 5 },

  // ── Neutros ──
  { name: "Erro ortográfico", category: "NEUTRAL" as const, points: 0 },
  { name: "Oportunidade de melhoria identificada", category: "NEUTRAL" as const, points: 0 },
  { name: "Atendimento dentro do esperado", category: "NEUTRAL" as const, points: 0 },
  { name: "Necessita de treinamento específico", category: "NEUTRAL" as const, points: 0 },

  // ── Negativos: Comunicação / Tom ──
  { name: "Resposta robótica", category: "NEGATIVE" as const, points: -3 },
  { name: "Tom inadequado", category: "NEGATIVE" as const, points: -5 },
  { name: "Falta de empatia", category: "NEGATIVE" as const, points: -5 },
  { name: "Resposta genérica", category: "NEGATIVE" as const, points: -3 },

  // ── Negativos: Texto / Formatação ──
  { name: "Formatação errada da frase", category: "NEGATIVE" as const, points: -2 },
  { name: "Erro de português", category: "NEGATIVE" as const, points: -2 },
  { name: "Mensagem confusa ou mal estruturada", category: "NEGATIVE" as const, points: -3 },
  { name: "Mensagem muito longa", category: "NEGATIVE" as const, points: -2 },
  { name: "Uso excessivo de emojis", category: "NEGATIVE" as const, points: -1 },

  // ── Negativos: Áudio ──
  { name: "Áudio muito curto", category: "NEGATIVE" as const, points: -2 },
  { name: "Áudio muito longo", category: "NEGATIVE" as const, points: -2 },
  { name: "Áudio com qualidade ruim", category: "NEGATIVE" as const, points: -3 },
  { name: "Áudio sem clareza na explicação", category: "NEGATIVE" as const, points: -3 },

  // ── Negativos: Atendimento / Conduta ──
  { name: "Informação incorreta", category: "NEGATIVE" as const, points: -5 },
  { name: "Não respondeu a dúvida do paciente", category: "NEGATIVE" as const, points: -4 },
  { name: "Falta de personalização", category: "NEGATIVE" as const, points: -3 },
  { name: "Falta de observar detalhes", category: "NEGATIVE" as const, points: -4 },
  { name: "Demora na resposta", category: "NEGATIVE" as const, points: -2 },
  { name: "Encerrou atendimento prematuramente", category: "NEGATIVE" as const, points: -4 },
  { name: "Não seguiu protocolo", category: "NEGATIVE" as const, points: -4 },
  { name: "Não identificou urgência", category: "NEGATIVE" as const, points: -5 },
  { name: "Faltou follow-up com o paciente", category: "NEGATIVE" as const, points: -3 },
  { name: "Encaminhou para setor errado", category: "NEGATIVE" as const, points: -4 },
];

interface UserSeed {
  name: string;
  email: string;
  password: string;
  role: "admin" | "leader" | "staff";
  departmentIndex: number | null;
}

const DEPT_SLUGS = ["atendimento", "consulta", "receita", "documentacao", "posvenda"];

function buildUsers(): UserSeed[] {
  const users: UserSeed[] = [];

  users.push({
    name: "Administrador",
    email: "admin@clickcannabis.com",
    password: "admin123",
    role: "admin",
    departmentIndex: null,
  });

  const leaderNames = [
    "Líder Atendimento",
    "Líder Consulta",
    "Líder Receita",
    "Líder Documentação",
    "Líder Pós-Venda",
  ];

  for (let i = 0; i < DEPT_SLUGS.length; i++) {
    users.push({
      name: leaderNames[i]!,
      email: `lider.${DEPT_SLUGS[i]}@clickcannabis.com`,
      password: "leader123",
      role: "leader",
      departmentIndex: i,
    });
  }

  for (let i = 0; i < DEPT_SLUGS.length; i++) {
    for (let j = 1; j <= 2; j++) {
      const slug = DEPT_SLUGS[i]!;
      users.push({
        name: `Atendente ${j} ${slug.charAt(0).toUpperCase() + slug.slice(1)}`,
        email: `atendente${j}.${slug}@clickcannabis.com`,
        password: "staff123",
        role: "staff",
        departmentIndex: i,
      });
    }
  }

  return users;
}

async function upsertUser(
  user: UserSeed,
  departmentIds: string[],
): Promise<string> {
  const existing = await prisma.user.findUnique({
    where: { email: user.email },
  });

  const departmentId =
    user.departmentIndex !== null ? departmentIds[user.departmentIndex] : null;

  if (existing) {
    await prisma.user.update({
      where: { id: existing.id },
      data: {
        role: user.role,
        departmentId: departmentId ?? undefined,
        isActive: true,
      },
    });
    return existing.id;
  }

  const userId = crypto.randomUUID();
  const accountId = crypto.randomUUID();
  const hashedPassword = await hashPassword(user.password);

  await prisma.user.create({
    data: {
      id: userId,
      name: user.name,
      email: user.email,
      emailVerified: false,
      role: user.role,
      departmentId: departmentId,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  });

  await prisma.account.create({
    data: {
      id: accountId,
      accountId: userId,
      providerId: "credential",
      userId: userId,
      password: hashedPassword,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  });

  return userId;
}

async function main() {
  console.log("🌱 Seeding database...\n");

  console.log("📁 Creating departments...");
  const departments = await Promise.all(
    DEPARTMENTS.map((name) =>
      prisma.department.upsert({
        where: { name },
        update: {},
        create: { name },
      }),
    ),
  );
  const departmentIds = departments.map((d) => d.id);
  console.log(`   ✓ ${departments.length} departments`);

  console.log("📋 Creating feedback types...");
  const feedbackTypes = await Promise.all(
    FEEDBACK_TYPES.map((ft) =>
      prisma.feedbackType.upsert({
        where: { name: ft.name },
        update: { category: ft.category, points: ft.points },
        create: {
          name: ft.name,
          category: ft.category,
          points: ft.points,
        },
      }),
    ),
  );
  console.log(`   ✓ ${feedbackTypes.length} feedback types`);

  console.log("👤 Creating users...");
  const userSeeds = buildUsers();
  const userIds: string[] = [];
  for (const user of userSeeds) {
    const id = await upsertUser(user, departmentIds);
    userIds.push(id);
  }
  console.log(`   ✓ ${userIds.length} users (1 admin, 5 leaders, 10 staff)`);

  console.log("\n✅ Seed completed!");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error("❌ Seed failed:", e);
    await prisma.$disconnect();
    process.exit(1);
  });
