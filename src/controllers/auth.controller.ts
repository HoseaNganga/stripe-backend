import { Request, Response } from "express";
import User from "../models/User";
import bcrypt from "bcryptjs";
import sendEmail from "../utils/SendEmail";
import { generateAccessToken, generateRefreshToken } from "../utils/jwt";
import jwt from "jsonwebtoken";

export const signupUser = async (req: Request, res: Response) => {
  try {
    const { email, password, phone_number, first_name, last_name } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "Email already in use" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const verificationCode = Math.floor(
      100000 + Math.random() * 900000
    ).toString();

    const verificationCodeExpires = new Date(Date.now() + 10 * 60 * 1000);

    const newUser = await User.create({
      email,
      password: hashedPassword,
      phone_number,
      first_name,
      last_name,
      isVerified: false,
      verificationCode,
      verificationCodeExpires,
    });

    await sendEmail(
      email,
      "Verify Your Account",
      `<p>Hello ${first_name},</p>
   <p>Your verification code is: <strong>${verificationCode}</strong></p>
   <p>This code will expire in 10 minutes.</p>`
    );

    return res.status(201).json({
      message: "Signup successful. Verification code sent to email.",
      user_info: {
        email: newUser.email,
        name: `${newUser.first_name} ${newUser.last_name}`,
      },
    });
  } catch (err) {
    console.error("Signup error:", err);
    res.status(500).json({ message: "Server error. Please try again later." });
  }
};

export const verifyUserAccount = async (req: Request, res: Response) => {
  const { email, code } = req.body;

  try {
    const user = await User.findOne({ email });

    if (!user) return res.status(404).json({ message: "User not found" });

    if (user.isVerified)
      return res.status(400).json({ message: "User already verified" });

    if (
      String(user.verificationCode) !== String(code) ||
      new Date() > user.verificationCodeExpires!
    ) {
      return res
        .status(400)
        .json({ message: "Invalid or expired verification code" });
    }

    user.isVerified = true;
    user.verificationCode = undefined;
    user.verificationCodeExpires = undefined;

    await user.save();

    res.status(200).json({ message: "Account verified successfully" });
  } catch (err) {
    console.error("Verification error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

export const loginUser = async (req: Request, res: Response) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email });
  if (!user) return res.status(404).json({ message: "User not found" });

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) return res.status(401).json({ message: "Invalid credentials" });

  if (!user.isVerified)
    return res.status(403).json({ message: "Email not verified" });

  const id = user._id as string;

  const accessToken = generateAccessToken(id.toString());
  const refreshToken = generateRefreshToken(id.toString());

  const accessTokenExpiry = Date.now() + 5 * 60 * 1000;
  const readableExpiry = new Date(accessTokenExpiry).toISOString();

  res
    .cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 24 * 60 * 60 * 1000,
    })
    .status(200)
    .json({
      access_token: accessToken,
      message: "User Successfully Logged In",
      expires_at: {
        timestamp: accessTokenExpiry,
        readable: readableExpiry,
      },
      data: {
        _id: user._id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        phone_number: user.phone_number,
        is_verified: user.isVerified,
      },
    });
};

export const refreshAccessToken = async (req: Request, res: Response) => {
  const token = req.cookies.refreshToken;

  if (!token) return res.status(401).json({ message: "No token provided" });

  try {
    const payload = jwt.verify(token, process.env.JWT_REFRESH_SECRET!) as any;

    const newAccessToken = generateAccessToken(payload.userId);
    const newRefreshToken = generateRefreshToken(payload.userId);

    const accessTokenExpiry = Date.now() + 5 * 60 * 1000;

    res
      .cookie("refreshToken", newRefreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 24 * 60 * 60 * 1000,
      })
      .status(200)
      .json({
        access: newAccessToken,
        expires_at: {
          timestamp: accessTokenExpiry,
          readable: new Date(accessTokenExpiry).toISOString(),
        },
      });
  } catch (err) {
    console.error("Refresh error", err);
    return res.status(403).json({ message: "Invalid refresh token" });
  }
};
