import { supabaseAdmin } from "../../../../utils/supabase_admin";

export const runtime = "edge";

export async function POST(req: Request) {
  try {
    const { query } = await req.json();
    const response = await fetch(
      "https://api.openai.com/v1/engines/davinci/embeddings",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: "text-embedding-ada-002",
          input: query,
        }),
      }
    );
    const json = await response.json();
    const embedding = json.data[0].embedding;
    const { data: chunks, error } = await supabaseAdmin.rpc("pg_search", {
      query_embedding: embedding,
      similarity_threshold: 0.01,
      match_count: 10,
    });
    if (error) {
      console.log(error);
      return new Response("Error", { status: 500 });
    }
    return new Response(JSON.stringify(chunks), { status: 200 });
  } catch (error) {
    console.log(error);
    return new Response("Error", { status: 500 });
  }
}
