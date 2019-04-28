'use strict';

const functions = require('firebase-functions');
const { WebhookClient } = require('dialogflow-fulfillment');
const { Card, Suggestion } = require('dialogflow-fulfillment');
const { Carousel } = require('actions-on-google');

process.env.DEBUG = 'dialogflow:debug'; // enables lib debugging statements

// URLs for images used in card rich responses
const imageUrl = 'https://developers.google.com/actions/images/badges/XPM_BADGING_GoogleAssistant_VER.png';
const imageUrl2 = 'https://lh3.googleusercontent.com/Nu3a6F80WfixUqf_ec_vgXy_c0-0r4VLJRXjVFF_X_CIilEu8B9fT35qyTEj_PEsKw';
const linkUrl = 'https://assistant.google.com/';

const axios = require('axios')

const jsdom = require("jsdom");
const { JSDOM } = jsdom;

function extractResultFromHtml(text) {
  //const key = text.search('class="r"')
  //return text.substring(key, key+ 256)

  const { window } = new JSDOM(text);
  const headerSection = window.document.querySelector('.r')
  const description = window.document.querySelector('.st')
  let url = window.document.querySelector('.r a').href//.match(/http(.*)/)
  if(url.match(/http(.*)/)) url = url.match(/http(.*)/)[0]
  else if(url[0] === '/') url = 'https://www.google.com' + url
  return {
    title: headerSection.textContent,
    url: url,
    desc: description.textContent
  }
}

exports.dialogflowFirebaseFulfillment = functions.https.onRequest((request, response) => {
  const agent = new WebhookClient({ request, response });
  //console.log('Dialogflow Request headers: ' + JSON.stringify(request.headers));
  //console.log('Dialogflow Request body: ' + JSON.stringify(request.body));

  function welcome(agent) {
    agent.add(`Welcome to my agent!`);
  }

  async function fallback(agent) {
    const queryFormatted = request.body.queryResult.queryText.trim()
    agent.add(`${queryFormatted} ???`);
    const resp = await axios.get(`https://www.google.com/search`,{params:{q:queryFormatted}})
    const fullRequestUrl = resp.request.res.req.agent.protocol+"//"+resp.request.res.connection._host+resp.request.path
    agent.add(`${fullRequestUrl}`)
    const result = resp.data
    const jsonResult = extractResultFromHtml(result)
    console.log(jsonResult)
    for (const key in jsonResult){
      let val = (jsonResult[key]||'')
      console.log(val)
      agent.add(`${key}: ${val}`)
    }

  }

  // Run the proper handler based on the matched Dialogflow intent
  let intentMap = new Map();
  intentMap.set('Default Welcome Intent', welcome);
  intentMap.set('Default Fallback Intent', fallback);
  agent.handleRequest(intentMap);
});
