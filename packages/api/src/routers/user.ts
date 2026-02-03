import { router, adminProcedure, leaderProcedure } from "../index";
import prisma from "@clickqaassist/db";
import z from "zod";
import { hashPassword } from "better-auth/crypto";
import crypto from "node:crypto";
import { fetchChatGuruUsers } from "../services/chatguru-users";

function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, ".")
    .replace(/^\.+|\.+$/g, "");
}

export const userRouter = router({
  list: adminProcedure.query(async () => {
    return prisma.user.findMany({
      orderBy: { name: "asc" },
      include: { department: true },
    });
  }),

  listByDepartment: leaderProcedure
    .input(
      z
        .object({
          departmentId: z.string().optional(),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const role = ctx.session.user.role;
      const userDeptId = ctx.session.user.departmentId;

      let departmentId: string | undefined;

      if (role === "admin") {
        departmentId = input?.departmentId;
      } else {
        departmentId = userDeptId ?? undefined;
      }

      return prisma.user.findMany({
        where: departmentId ? { departmentId } : undefined,
        orderBy: { name: "asc" },
        include: { department: true },
      });
    }),

  create: adminProcedure
    .input(
      z.object({
        name: z.string().min(1, "Nome é obrigatório"),
        email: z.string().email("Email inválido"),
        password: z.string().min(1, "Senha é obrigatória"),
        role: z.enum(["admin", "leader", "staff"]),
        departmentId: z.string().nullable(),
        chatGuruName: z.string().optional(),
        phone: z.string().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const userId = crypto.randomUUID();
      const accountId = crypto.randomUUID();
      const hashedPassword = await hashPassword(input.password);

      const user = await prisma.user.create({
        data: {
          id: userId,
          name: input.name,
          email: input.email,
          emailVerified: false,
          role: input.role,
          departmentId: input.departmentId,
          chatGuruName: input.chatGuruName ?? null,
          phone: input.phone ?? null,
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

      return user;
    }),

  update: adminProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1).optional(),
        email: z.string().email().optional(),
        role: z.enum(["admin", "leader", "staff"]).optional(),
        departmentId: z.string().nullable().optional(),
        chatGuruName: z.string().nullable().optional(),
        phone: z.string().nullable().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      return prisma.user.update({
        where: { id },
        data,
      });
    }),

  toggleActive: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      const user = await prisma.user.findUniqueOrThrow({
        where: { id: input.id },
      });
      return prisma.user.update({
        where: { id: input.id },
        data: { isActive: !user.isActive },
      });
    }),

  fetchChatGuruUsers: adminProcedure.query(async () => {
    return fetchChatGuruUsers();
  }),

  importFromChatGuru: adminProcedure
    .input(
      z.object({
        users: z.array(
          z.object({
            name: z.string(),
            chatGuruName: z.string(),
            departmentId: z.string(),
            role: z.enum(["leader", "staff"]),
          }),
        ),
      }),
    )
    .mutation(async ({ input }) => {
      const results = [];

      for (const u of input.users) {
        const email = `${slugify(u.name)}@clickcannabis.com`;
        const userId = crypto.randomUUID();
        const accountId = crypto.randomUUID();
        const hashedPassword = await hashPassword("click123");

        const user = await prisma.user.create({
          data: {
            id: userId,
            name: u.name,
            email,
            emailVerified: false,
            role: u.role,
            departmentId: u.departmentId,
            chatGuruName: u.chatGuruName,
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

        results.push(user);
      }

      return results;
    }),
});
