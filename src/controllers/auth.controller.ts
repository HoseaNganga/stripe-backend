import { Request, Response } from "express";
import User from "../models/User";
import bcrypt from "bcryptjs";
import sendEmail from "../utils/SendEmail";

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
      user.verificationCode !== code ||
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
