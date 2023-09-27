import axios from "axios";
import * as cheerio from "cheerio";
import { PGEssay } from "../types";
import { encode } from "gpt-3-encoder";

const BASE_URL = "http://www.paulgraham.com";

const LinksArr: { href: string; title: string }[] = [];

const getEssays = async (url: string, title: string) => {
  let essay: PGEssay = {
    title: "",
    url: "",
    date: "",
    thanks: "",
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
        thanks: "",
        content: essayText,
        length: essayText.length,
        tokens: encode(essayText).length, // used to get the number of tokens in the essay for embeddings
        chunks: [],
      };
    }
  });
  return essay;
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
            console.log(LinksArr);
          }
        });
      }
    });
    return LinksArr;
  } catch (error) {
    console.log(error);
  }
};

const test = async () => {
  const links = await getLinks();
  if (!links) return console.log("no links");
  for (let i = 0; i < links.length; i++) {
    const link = links[i];
    const essay = await getEssays(link.href, link.title);
    console.log(essay);
  }
};
test();
