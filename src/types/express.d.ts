import { ISessionUser } from "./index";

declare global {
  namespace Express {
    interface User extends ISessionUser {}

    interface Request {
      user?: ISessionUser;
    }
  }
}
