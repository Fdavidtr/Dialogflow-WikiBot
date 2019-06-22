'use strict';

const functions = require('firebase-functions');
const { WebhookClient } = require('dialogflow-fulfillment');

process.env.DEBUG = 'dialogflow:debug'; // enables lib debugging statements
process.env["NODE_TLS_REJECT_UNAUTHORIZED"] = 0;

const axios = require('axios');

const SIGN = "\n\n*justwaps.com*";

exports.dialogflowFirebaseFulfillment = functions.https.onRequest((request, response) => {
  const agent = new WebhookClient({ request, response });
  //console.log('Dialogflow Request headers: ' + JSON.stringify(request.headers));
  //console.log('Dialogflow Request body: ' + JSON.stringify(request.body));

  function welcome(agent) {
    agent.add(`Welcome to my agent!`);
  }

  function getWikiUrlByLangcode(langCode) {
    if(langCode==='it'){
      return 'http://it.wikipedia.org/w/api.php'; 
    }
    if(langCode==='es'){
      return 'http://es.wikipedia.org/w/api.php';
    }
    return 'http://en.wikipedia.org/w/api.php';
  }

  function getLangcodeByPrefix(prefix) {
    if(prefix === '34') {
      return 'es';
    }
    if(prefix === '39') {
      return 'it';
    }
    return 'en';
  }

  function clearText(text) {
    return text.replace(/\n\n/g,"\n").replace(/=== /g,"_").replace(/ ===/g,"_").replace(/== /g,"*").replace(/ ==/g,"*")
  }

  const messages = {
    es: {
      not_found: 'No puedo encontrarlo.\n_Compruebe MAYÚSCULAS y minúsculas._'
    },
    it: {
      not_found: 'Non lo trovo.\n_Verifica MAIUSCOLE e minuscole._'
    },
    en: {
      not_found: 'I can not find it.\n_Check UPPER and lower case._'
    }
  }

  async function fallback(agent) {
    const words = request.body.queryResult.queryText.trim().split(" ");//.map(e=>e.charAt(0).toUpperCase() + e.slice(1))
    const queryFormatted = words.join(" ")//.toLowerCase()
     
    try {
      //http://en.wikipedia.org/w/api.php?format=json&action=query&prop=extracts&explaintext=1&titles=Unix

      const prefix = request.body.session.split("/").pop().slice(1,3);
      const langCode = getLangcodeByPrefix(prefix);
      const wiki_url = getWikiUrlByLangcode(langCode);
      const paramsSearch = {
        action: 'query',
        generator: 'search',
        gsrsearch: queryFormatted,
        prop: 'info',
        format : "json",
        origin: "*",
        utf8: 1
      }
      const searchResp = await axios.get(wiki_url,{params:paramsSearch})
      let title;
      if( searchResp.data.query ) {
        const foundPages = searchResp.data.query.pages;
        const page = foundPages[Object.keys(foundPages).find(e => foundPages[e].index == '1')];
        title = decodeURI(page.title);
      } else {
        title = queryFormatted;
      }

      const paramsPage = {
        titles : title,
        explaintext : 1,
        utf8: 1,
        redirects: 1,
        prop : "extracts",
        action : "query",
        format : "json",
        origin : "*"
      };
      const resp = await axios.get(wiki_url,{params:paramsPage})
      const pages = resp.data.query['pages']
      const pageKey = Object.keys(pages)[0]
      //const response = pageKey === '-1' ?  'Página inexistente' : pages[pageKey].extract.substring(0,500);
      let response =  `👉 *${title}*\n`;
      if(pageKey === '-1')
      {
        response += messages[langCode].not_found;
      } else {
        const extract = clearText(pages[pageKey].extract.substring(0,2000));
        const k = extract.lastIndexOf('.')
        response += extract.substring(0,k+1)
      }
      response += SIGN;
      //agent.add()
      agent.add(response)

    } catch(e) {
      agent.add('Error al comunicar con wiki')
      console.error(e)
      //throw e
    }
  }

  // Run the proper handler based on the matched Dialogflow intent
  let intentMap = new Map();
  intentMap.set('Default Welcome Intent', welcome);
  intentMap.set('Default Fallback Intent', fallback);
  agent.handleRequest(intentMap);
});
