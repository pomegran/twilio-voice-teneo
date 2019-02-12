const http = require('http');
const chalk = require('chalk');
const qs = require('querystring');
const VoiceResponse = require('twilio').twiml.VoiceResponse;
const TIE = require('@artificialsolutions/tie-api-client');
const {
  TENEO_ENGINE_URL,
  WEBHOOK_FOR_TWILIO,
  FIRST_INPUT_FOR_TENEO
} = process.env;
const port = process.env.PORT || 1337;
const teneoApi = TIE.init(TENEO_ENGINE_URL);
const firstInput = process.env.FIRST_INPUT_FOR_TENEO || '';

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

		if (post.CallStatus == 'ringing') { // If first input of call, send default input to Teneo (blank here)
			textToSend = firstInput;
		} else if (post.CallStatus = 'in-progress' && post.SpeechResult) { // Spoken responses
			textToSend = post.SpeechResult;
		} else { // Unrecognized, send blank
			textToSend = '';
		}

		var callId = post.CallSid;
		var phoneNumber = post.Caller;
		var teneoSessionId = getSession(callId);

		teneoApi.sendInput(teneoSessionId, {text: textToSend, channel: 'twilio', phoneNumber: phoneNumber}).then(teneoResponse => {

			setSession(callId, teneoResponse.sessionId);

			const twiml = new VoiceResponse();
			const response = twiml.gather({
				action: WEBHOOK_FOR_TWILIO,
				input: 'speech',
				speechTimeout: 1
			});

			console.log(chalk.yellow('Caller ID: '+callId));
			if (textToSend)
				console.log(chalk.green('Captured Input: '+textToSend));
			if (teneoResponse.output.text)
				console.log(chalk.blue('Spoken Output: '+teneoResponse.output.text));

			response.say(teneoResponse.output.text);
			res.writeHead(200, { 'Content-Type': 'text/xml' });
			res.end(twiml.toString());

		});

	});

}).listen(port);

console.log(chalk.bold('Twilio will send messages to this server on: '+WEBHOOK_FOR_TWILIO+':'+port));