import "dotenv/config";
import pg from "pg";

console.log("DATABASE_URL =", process.env.DATABASE_URL);

const { Client } = pg;

const client = new Client({
  connectionString: process.env.DATABASE_URL,
});

async function main() {
  await client.connect();

  const result = await client.query("SELECT NOW()");

  console.log(result.rows);

  await client.end();
}

main().catch(console.error);