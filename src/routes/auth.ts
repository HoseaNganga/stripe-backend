import express from "express";
import {
  loginUser,
  refreshAccessToken,
  signupUser,
  verifyUserAccount,
} from "../controllers/auth.controller";

const router = express.Router();

router.post("/signup", signupUser);

router.post("/verify", verifyUserAccount);

router.post("/login", loginUser);

router.post("/refresh", refreshAccessToken);

export default router;
