import { TOKEN_SECRET, JWT_EXPIRES_IN } from "../config.js";
import jwt from "jsonwebtoken";

export async function createAccessToken(payload) {
  return new Promise((resolve, reject) => {
    jwt.sign({ id: payload._id }, TOKEN_SECRET, { expiresIn: JWT_EXPIRES_IN }, (err, token) => {
      if (err) reject(err);
      resolve(token);
    });
  });
}

export async function createRequestToken(payload) {
  return new Promise((resolve, reject) => {
    jwt.sign(payload, TOKEN_SECRET, { expiresIn: JWT_EXPIRES_IN }, (err, token) => {
      if (err) reject(err);
      resolve(token);
    });
  });
}