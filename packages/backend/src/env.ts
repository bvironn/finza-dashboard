import dotenv from "dotenv"
import path from "path"
import { existsSync } from "fs"

// In production (Docker), env vars come from the container environment.
// In development, load from the root .env file.
const envPath = path.resolve(import.meta.dirname, "../../../.env")
if (existsSync(envPath)) {
  dotenv.config({ path: envPath })
}
