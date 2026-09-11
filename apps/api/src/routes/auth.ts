import { Router } from "express";
import { hash, compare } from "bcryptjs";
import { signupSchema, loginSchema } from "@perch/shared"
import { validate } from "../middleware/validate";
import { generateToken } from "../lib/jwt";
import { prisma } from "../lib/prisma";

const router = Router();

router.post("/signup", validate(signupSchema), async (req, res) => {
  try {
    const { name, email, password } = req.body;

    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return res.status(409).json({
        error: "Email already registered",
        code: "EMAIL_EXISTS",
      });
    }

    const passwordHash = await hash(password, 12);

    const user = await prisma.user.create({
      data: {
        email,
        name,
        passwordHash,
      },
    });

    const token = generateToken({
      userId: user.id,
      email: user.email,
    });

    return res.status(201).json({
      message: "User created successfully",
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
      token,
    });
  } catch (error) {
    console.error("Signup error:", error);
    return res.status(500).json({
      error: "Failed to create user",
      code: "SIGNUP_ERROR",
    });
  }
});

router.post("/login", validate(loginSchema), async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return res.status(401).json({
        error: "Invalid email or password",
        code: "INVALID_CREDENTIALS",
      });
    }

    const isPasswordValid = await compare(password, user.passwordHash);

    if (!isPasswordValid) {
      return res.status(401).json({
        error: "Invalid email or password",
        code: "INVALID_CREDENTIALS",
      });
    }

    const token = generateToken({
      userId: user.id,
      email: user.email,
    });

    return res.status(200).json({
      message: "Login successful",
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
      token,
    });
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({
      error: "Failed to authenticate user",
      code: "LOGIN_ERROR",
    });
  }
});

export default router;
