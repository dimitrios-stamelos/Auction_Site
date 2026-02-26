import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { PrismaClient } from "@prisma/client";
import validator from "validator";

const prisma = new PrismaClient();

/**
 * User Registration
 * - Ελέγχει αν υπάρχει ήδη email ή username
 * - Κάνει hash το password
 * - Αποθηκεύει όλα τα απαιτούμενα πεδία (firstName, lastName κλπ)
 * - Βάζει approved: false
 * - Δεν επιστρέφει ποτέ hash ή sensitive info
 */
export const register = async (req, res) => {
  try {
    const {
      username,
      email,
      password,
      firstName,
      lastName,
      phone,
      address,
      city,
      country,
      afm,
    } = req.body;

    if (!validator.isEmail(email)) {
      return res.status(400).json({ message: "Invalid email format" });
    }

    // Έλεγχος αν υπάρχει username ή email
    const existing = await prisma.user.findFirst({
      where: {
        OR: [{ email }, { username }],
      },
    });
    if (existing) {
      return res
        .status(400)
        .json({ message: "Username or email already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await prisma.user.create({
      data: {
        username,
        email,
        password: hashedPassword,
        firstName,
        lastName,
        phone,
        address,
        city,
        country,
        afm,
        // approved και role παίρνουν τα default από το schema
      },
    });

    res.status(201).json({
      message: "Registration successful. Await admin approval.",
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Registration failed." });
  }
};

/**
 * User Login
 * - Ελέγχει αν υπάρχει ο χρήστης με αυτό το email
 * - Ελέγχει αν είναι approved
 * - Ελέγχει το password (hash compare)
 * - Επιστρέφει JWT και user info ΧΩΡΙΣ το hash
 */
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) return res.status(404).json({ message: "User not found" });

    if (!user.approved)
      return res.status(403).json({ message: "User not approved yet" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch)
      return res.status(400).json({ message: "Invalid credentials" });

    const token = jwt.sign(
      { id: user.id, role: user.role, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    // Αφαιρούμε το hash πριν στείλουμε το user object!
    const { password: _, ...userWithoutPass } = user;

    res.json({ token, user: userWithoutPass });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Login failed." });
  }
};
