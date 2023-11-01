
import { OpenAIStream } from "../../../../utils/openai_stream";

export const runtime = "edge";

export async function POST(req: Request) {
  try {
    const { prompt , apiKey } = await req.json();
    const stream = await OpenAIStream(prompt,apiKey);
    return new Response(stream);
  } catch (error) {
    console.log(error);
    return new Response("Error", { status: 500 });
  }
}
