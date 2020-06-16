const http = require('http');
const chalk = require('chalk');
const qs = require('querystring');
const VoiceResponse = require('twilio').twiml.VoiceResponse;
const TIE = require('@artificialsolutions/tie-api-client');

const {
  TENEO_ENGINE_URL,
  WEBHOOK_FOR_TWILIO,
  ACCOUNT_SID,
  AUTH_TOKEN,
  FIRST_INPUT_FOR_TENEO,
  LANGUAGE_STT,
  LANGUAGE_TTS,
  PORT
} = process.env;
const port = PORT || 1337;
const teneoApi = TIE.init(TENEO_ENGINE_URL);
const firstInput = FIRST_INPUT_FOR_TENEO || '';
const language_STT = LANGUAGE_STT || 'en-GB';
const language_TTS = LANGUAGE_TTS || 'Polly.Emma';
const accountSid = ACCOUNT_SID || ''; // Only required for SMS
const authToken = AUTH_TOKEN || ''; // Only required for SMS

console.log (language_STT);
console.log (language_TTS);

/***
 * VERY BASIC SESSION HANDLER
 ***/

var keyPair = new Map();

function getSession (userId) {
	var sessionId = '';
	sessionId = keyPair.get(userId);
	if (typeof(sessionId) == 'undefined')
		sessionId = null;
	return sessionId;
}

function setSession (userId, sessionId) {
	keyPair.set(userId,sessionId);
}

/***
 * LISTEN FOR INPUTS FROM TWILIO, SEND TO TENEO AND RESPOND
 ***/

var server = http.createServer((req, res) => {

	var body = '';
	req.on('data', function (data) {
		body += data;
	});

	req.on('end', function () {

		var post = qs.parse(body);
		var textToSend = '';

		console.log (post);

		if (post.CallStatus == 'ringing') { // If first input of call, send default input to Teneo (blank here)
			textToSend = firstInput;
		} else if (post.CallStatus = 'in-progress' && post.SpeechResult) { // Spoken responses
			textToSend = post.SpeechResult;
		} else if (post.CallStatus = 'in-progress' && post.Digits) { // DTMF Input
			textToSend = post.Digits;
		} else { // Unrecognized, send blank
			textToSend = '';
		}

		var callId = post.CallSid;
		var phoneNumber = post.Caller;
		var teneoSessionId = getSession(callId);

		teneoApi.sendInput(teneoSessionId, {text: textToSend, channel: 'twilio', phoneNumber: phoneNumber}).then(teneoResponse => {

			setSession(callId, teneoResponse.sessionId);

			const twiml = new VoiceResponse();
			var response = null;

			var customTimeout = 'auto';
			if (teneoResponse.output.parameters.twilio_customTimeout) {
				customTimeout = parseInt(teneoResponse.output.parameters.twilio_customTimeout);
			}

			var customVocabulary = ''; // If the output parameter 'twilio_customVocabulary' exists, it will be used for custom vocabulary understanding.  This should be a comma separated list of words to recognize
			if (teneoResponse.output.parameters.twilio_customVocabulary) {
				customVocabulary = teneoResponse.output.parameters.twilio_customVocabulary;
			}

			var enhancedModel = false; // If the output parameter 'twilio_enhancedModel' exists, Twilio's enhanced model will be used.
			var speechModel = "default";
			if (teneoResponse.output.parameters.twilio_enhancedModel) {
				if (teneoResponse.output.parameters.twilio_enhancedModel == "true") {
					enhancedModel = true;
					speechModel = "phone_call";
				}
			}

			if (teneoResponse.output.parameters.twilio_smsText) { // If the output parameter 'twilio_smsText' exists, send a text
				console.log ("SMS Sent from " + post.Called + " to " + phoneNumber + " with the message " + teneoResponse.output.parameters.twilio_smsText);
				const client = require('twilio')(accountSid, authToken);
				client.messages
					.create({from: post.Called, body: teneoResponse.output.parameters.twilio_smsText, to: phoneNumber});
			}

			if  (teneoResponse.output.parameters.twilio_endCall == 'true') { // If the output parameter 'twilio_endcall' exists, the call will be ended
				response = twiml.hangup();
			} else {
				console.log("Custom vocab: "+teneoResponse.output.parameters.twilio_customVocabulary);
				response = twiml.gather({
					language: language_STT,
					hints: customVocabulary,
					action: WEBHOOK_FOR_TWILIO,
					input: 'dtmf speech',
					speechModel : speechModel,
					enhanced : enhancedModel,
					speechTimeout: customTimeout
				});

				var textToSay = teneoResponse.output.text;
				if (teneoResponse.output.parameters.twilio_customOutput) // If the output parameter 'twilio_customOutput' exists, read this instead of output text
					textToSay = teneoResponse.output.parameters.twilio_customOutput;

				response.say({
				    voice: language_TTS
				}, textToSay);
			}

			console.log(chalk.yellow('Caller ID: '+callId));
			if (textToSend)
				console.log(chalk.green('Captured Input: '+textToSend));
			if (teneoResponse.output.text)
				console.log(chalk.blue('Spoken Output: '+teneoResponse.output.text));

			res.writeHead(200, { 'Content-Type': 'text/xml' });
			res.end(twiml.toString());

		});

	});

}).listen(port);

console.log(chalk.bold('Twilio will send messages to this server on: '+WEBHOOK_FOR_TWILIO+':'+port));