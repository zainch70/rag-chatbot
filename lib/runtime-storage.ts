import os from "os";
import path from "path";

export function isServerlessRuntime() {
  return (
    process.env.VERCEL === "1" ||
    Boolean(process.env.AWS_LAMBDA_FUNCTION_NAME) ||
    Boolean(process.env.AWS_EXECUTION_ENV)
  );
}

export function getLocalUploadsDirectory() {
  return path.join(process.cwd(), "uploads");
}

export function getServerlessUploadsDirectory() {
  return path.join(os.tmpdir(), "rag-uploads");
}
