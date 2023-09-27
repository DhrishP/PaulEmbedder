import axios from "axios";
import * as cheerio from "cheerio";

const BASE_URL ="http://www.paulgraham.com";

const getLinks = async () => {
    try {
        const html = await axios.get(`${BASE_URL}/articles.html`);
        const $ = cheerio.load(html.data);
        console.log(html.data)
    } catch (error) {
        console.log(error)
    }
  
}

getLinks();


