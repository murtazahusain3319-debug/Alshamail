import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import usersRouter from "./users";
import applicationsRouter from "./applications";
import coursesRouter from "./courses";
import lessonsRouter from "./lessons";
import scheduleRouter from "./schedule";
import messagesRouter from "./messages";
import badgesRouter from "./badges";
import profileRouter from "./profile";
import dashboardsRouter from "./dashboards";
import classesRouter from "./classes";
import gradesRouter from "./grades";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(usersRouter);
router.use(applicationsRouter);
router.use(coursesRouter);
router.use(lessonsRouter);
router.use(scheduleRouter);
router.use(messagesRouter);
router.use(badgesRouter);
router.use(profileRouter);
router.use(dashboardsRouter);
router.use(classesRouter);
router.use(gradesRouter);

export default router;
