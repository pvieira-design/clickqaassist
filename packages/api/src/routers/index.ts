import { protectedProcedure, publicProcedure, router } from "../index";
import { feedbackTypeRouter } from "./feedbackType";
import { departmentRouter } from "./department";
import { userRouter } from "./user";
import { chatRouter } from "./chat";
import { feedbackRouter } from "./feedback";
import { contestationRouter } from "./contestation";
import { scoreRouter } from "./score";

export const appRouter = router({
  healthCheck: publicProcedure.query(() => {
    return "OK";
  }),
  privateData: protectedProcedure.query(({ ctx }) => {
    return {
      message: "This is private",
      user: ctx.session.user,
    };
  }),
  feedbackType: feedbackTypeRouter,
  department: departmentRouter,
  user: userRouter,
  chat: chatRouter,
  feedback: feedbackRouter,
  contestation: contestationRouter,
  score: scoreRouter,
});
export type AppRouter = typeof appRouter;
