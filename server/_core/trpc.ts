import { NOT_ADMIN_ERR_MSG, UNAUTHED_ERR_MSG } from '@shared/const';
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import type { TrpcContext } from "./context";

const t = initTRPC.context<TrpcContext>().create({
  transformer: superjson,
});

export const router = t.router;
export const publicProcedure = t.procedure;

// ============================================
// AUTENTICAÇÃO DESABILITADA TEMPORARIAMENTE
// ============================================
// TODO: Descomentar para reativar autenticação

/*
const requireUser = t.middleware(async opts => {
  const { ctx, next } = opts;

  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  }

  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
    },
  });
});

export const protectedProcedure = t.procedure.use(requireUser);
*/

// ============================================
// MODO SEM AUTENTICAÇÃO (USUÁRIO MOCK)
// ============================================

const mockUserMiddleware = t.middleware(async opts => {
  const { ctx, next } = opts;

  // Sempre retorna usuário mock
  const mockUser = {
    id: "mock-user-id",
    name: "Usuário Demo",
    email: "demo@nfce-downloader.com",
    role: "user" as const,
  };

  return next({
    ctx: {
      ...ctx,
      user: mockUser,
    },
  });
});

export const protectedProcedure = t.procedure.use(mockUserMiddleware);

export const adminProcedure = t.procedure.use(
  t.middleware(async opts => {
    const { ctx, next } = opts;

    if (!ctx.user || ctx.user.role !== 'admin') {
      throw new TRPCError({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
    }

    return next({
      ctx: {
        ...ctx,
        user: ctx.user,
      },
    });
  }),
);
