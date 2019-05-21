'use strict';

const functions = require('firebase-functions');
const { WebhookClient } = require('dialogflow-fulfillment');
const { Card, Suggestion } = require('dialogflow-fulfillment');
const { Carousel } = require('actions-on-google');
/*const baseParams = {
  key:'AIzaSyAajQJy4vg0EQB0S-pBbi2nAilgeawJmI4',
  cx: '009280483232755211995:pprz59v-k10'
}*/

process.env.DEBUG = 'dialogflow:debug'; // enables lib debugging statements
process.env["NODE_TLS_REJECT_UNAUTHORIZED"] = 0;
// URLs for images used in card rich responses
const imageUrl = 'https://developers.google.com/actions/images/badges/XPM_BADGING_GoogleAssistant_VER.png';
const imageUrl2 = 'https://lh3.googleusercontent.com/Nu3a6F80WfixUqf_ec_vgXy_c0-0r4VLJRXjVFF_X_CIilEu8B9fT35qyTEj_PEsKw';
const linkUrl = 'https://assistant.google.com/';

const axios = require('axios')

const jsdom = require("jsdom");
const { JSDOM } = jsdom;

function extractResultFromHtml(text) {

}

function delay(t, v) {
  return new Promise(function(resolve) {
    setTimeout(resolve.bind(null, v), t)
  });
}

exports.dialogflowFirebaseFulfillment = functions.https.onRequest((request, response) => {
  const agent = new WebhookClient({ request, response });
  //console.log('Dialogflow Request headers: ' + JSON.stringify(request.headers));
  //console.log('Dialogflow Request body: ' + JSON.stringify(request.body));

  function welcome(agent) {
    agent.add(`Welcome to my agent!`);
  }

  async function fallback(agent) {
    const queryFormatted = request.body.queryResult.queryText.trim().replace(' ','+')
    try {
      //http://en.wikipedia.org/w/api.php?format=json&action=query&prop=extracts&explaintext=1&titles=Unix
      const params = {
        titles : queryFormatted,
        explaintext : 1,
        redirects: 1,
        prop : "extracts",
        action : "query",
        format : "json",
        origin : "*"
      }
      const resp = await axios.get('http://es.wikipedia.org/w/api.php',{params:params})
      //console.log(resp.request)
      const pages = resp.data.query['pages']
      const pageKey = Object.keys(pages)[0]
      const response = pageKey === '-1' ?  'Página inexistente' : pages[pageKey].extract.substring(0,500)
      console.log('query:',queryFormatted)
      console.log('respuesta:',response)

      //agent.add()
      agent.add(response)
      /*for (const key in jsonResult){
        let val = (jsonResult[key]||'')
        console.log(val)
        agent.add(`${key}: ${val}`)
      }*/
    } catch(e) {
      agent.add('Error al comunicar con google')
      //throw e
    }
  }

  // Run the proper handler based on the matched Dialogflow intent
  let intentMap = new Map();
  intentMap.set('Default Welcome Intent', welcome);
  intentMap.set('Default Fallback Intent', fallback);
  agent.handleRequest(intentMap);
});
