import axios from "axios";
import * as cheerio from "cheerio";
import { PGChunk, PGEssay, PGJSON } from "../types";
import { encode } from "gpt-3-encoder";
import fs from "fs";

const BASE_URL = "http://www.paulgraham.com";
const CHUNK_SIZE = 1000;

const LinksArr: { href: string; title: string }[] = [];

const getEssays = async (url: string, title: string) => {
  let essay: PGEssay = {
    title: "",
    url: "",
    date: "",
    content: "",
    length: 0,
    tokens: 0,
    chunks: [],
  };
  const html = await axios.get(`${BASE_URL}/${url}`);
  const $ = cheerio.load(html.data);
  const tables = $("table");
  tables.each((i, table) => {
    if (i === 1) {
      const text = $(table).text();
      let cleanedtext = text.replace(/\s\s+/g, " "); // used to remove extra spaces
      cleanedtext = cleanedtext.replace(/\.([a-zA-Z])/g, ". $1"); // used to add space after period
      const date = cleanedtext.match(/([A-Z][a-z]+ [0-9]{4})/); // used to get date
      let dateStr = "";
      let textWithoutDate = "";
      if (date) {
        dateStr = date[0];
        textWithoutDate = cleanedtext.replace(dateStr, "");
      }
      let essayText = textWithoutDate.replace(/\n/g, " "); // used to remove new lines
      essay = {
        title: title,
        url: `${BASE_URL}/${url}`,
        date: dateStr,
        content: essayText,
        length: essayText.length,
        tokens: encode(essayText).length, // used to get the number of tokens in the essay for embeddings
        chunks: [],
      };
    }
  });
  return essay;
};

const chunkEssay = async (essay: PGEssay) => {
  const { title, url, date, content } = essay;

  let essayTextChunks:string[] = [];

  if (encode(content).length > CHUNK_SIZE) {
    const split = content.split(". "); // makes an essayChunks of sentences by splitting at the period and space which was added by the regex above
    let chunkText = "";

    for (let i = 0; i < split.length; i++) {
      const sentence = split[i];
      const sentenceTokenLength = encode(sentence).length;
      const chunkTextTokenLength = encode(chunkText).length;

      if (chunkTextTokenLength + sentenceTokenLength > CHUNK_SIZE) {
        essayTextChunks.push(chunkText);
        chunkText = "";
      }

      if (sentence && sentence[sentence.length-1].match(/[a-z0-9]/i)) {
        // used to add period to the end of the sentence if it doesn't have one
        chunkText += sentence + ". ";
      } else {
        chunkText += sentence + " "; // used to add space to the end of the sentence if it doesn't have one
      }
    }

    essayTextChunks.push(chunkText.trim()); // used to remove extra spaces
  } else {
    essayTextChunks.push(content.trim());
  }
  //putting the array of strings(essayTextChunks) into an array of objects(essayChunks)
  const essayChunks = essayTextChunks.map((text) => {
    const trimmedText = text.trim();
    const chunk: PGChunk = {
      essay_title: title,
      essay_url: url,
      essay_date: date,
      content: trimmedText,
      content_length: trimmedText.length,
      content_tokens: encode(trimmedText).length,
      embedding: [],
    };

    return chunk;
  });
  if (essayChunks.length > 1) {
    for (let i = 0; i < essayChunks.length; i++) {
      const chunk = essayChunks[i];
      const prevChunk = essayChunks[i - 1];
      if (chunk.content_tokens < 100 && prevChunk) {
        prevChunk.content += " " + chunk.content;
        prevChunk.content_tokens = encode(prevChunk.content).length;
        essayChunks.splice(i, 1); // used to remove the chunk from the array
        i--; // used to decrement the index so that the loop doesn't skip the next chunk
      }
    }
  }
  const chunkSection: PGEssay = {
    ...essay,
    chunks: essayChunks,
  };
  return chunkSection;
};

const getLinks = async () => {
  try {
    const html = await axios.get(`${BASE_URL}/articles.html`);
    const $ = cheerio.load(html.data);
    const tables = $("table");
    tables.each((i, element) => {
      if (i === 2) {
        const links = $(element).find("a");
        links.each((i, link) => {
          const href = $(link).attr("href"); //gets the attribute of the a tag
          const title = $(link).text(); // get the text of the a tag
          if (href && title) {
            const obj = {
              href,
              title,
            };
            LinksArr.push(obj);
          }
        });
      }
    });
    return LinksArr;
  } catch (error) {
    console.log(error);
  }
};

import path from "path";

const test = async () => {
  const links = await getLinks();
  let essays: PGEssay[] = [];
  if (!links) return console.log("no links");
  for (let i = 0; i < links.length; i++) {
    const essay = await getEssays(links[i].href, links[i].title);
    const ChunkedEssay = await chunkEssay(essay);
    essays.push(ChunkedEssay);
    const json: PGJSON = {
      tokens:essays.reduce((acc,essay)=>acc+essay.tokens,0),
      essays
    }
    const filePath = path.join(__dirname, "pg1000.json");
    fs.writeFileSync(filePath, JSON.stringify(json));
  }
  
  
};
test();

