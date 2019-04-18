This is a node application that allows you to use Twilio Voice (IVR) to connect to a Teneo Bot.  Also includes an app.json to allow one-click deployment to Heroku (free dyno).

Twilio Setup

1. Setup a free Twilio account and phone number
2. Go to "All Products and Service" and click "Programmable Voice"
3. Click on submenu "Numbers"
4. Click on "Manage Numbers"
5. Click your number to configure
6. Under "Voice & Fax" -> "A call comes in" set the webhook to https://<your heroku app name>.herokuapp.com

Heroku Setup (assuming you already have a free account) 

1. Go to this link:

https://heroku.com/deploy?template=https://github.com/pomegran/twilio-voice-teneo/

2. Ensure your app name is the same as that entered in step 6 above
3. Enter config var "TENEO_ENGINE_URL" e.g. https://teneo5-demos.presales.artificial-solutions.com/mydemokb
4. Enter config var "WEBHOOK_FOR_TWILIO" i.e. https://<your heroku app name>.herokuapp.com

   Option config vars:

   PORT : Port this runs on.  Defaults to 1337
   LANGUAGE_SST : Please enter your Twilio Language for voice recognition (STT).  Defaults to 'en-GB'.  List is here: https://www.twilio.com/docs/voice/twiml/gather#languagetags
   LANGUAGE_TTS : Please enter your Twilio Language for spoken voice (TTS) - will use Amazon Polly.  Defaults to 'Polly.Emma'.  List is here: https://www.twilio.com/docs/voice/twiml/say/text-speech#amazon-polly
   FIRST_INPUT_FOR_TENEO : First input to send to Teneo when a call starts.  Empty if not entered

5. Click "Deploy App"

You should now be able to call the number and speak to your bot.


Other notes:

1. Support languages for language_STT can be found here: https://www.twilio.com/docs/voice/twiml/gather#languagetags