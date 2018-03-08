require('dotenv').config()

const axios = require('axios')
const express = require('express')
const request = require('request')
const bodyParser = require('body-parser')

const createSlackEventAdapter = require('@slack/events-api').createSlackEventAdapter
const slackEvents = createSlackEventAdapter(process.env.SLACK_VERIFICATION_TOKEN)

const ACCESS_TOKEN = process.env.SLACK_ACCESS_TOKEN

const app = express()
app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json())

app.listen(process.env.PORT, function () {
  console.log('Example app listening on port ' + `${process.env.PORT}`)
})

// This route handles GET requests to our root ngrok address and responds with the same "Ngrok is working message" we used before
app.get('/', function (req, res) {
  res.send('Ngrok is working! Path Hit: ' + req.url)
})

// This route handles get request to a /oauth endpoint. We'll use this endpoint for handling the logic of the Slack oAuth process behind our app.
app.get('/oauth', function (req, res) {
    // When a user authorizes an app, a code query parameter is passed on the oAuth endpoint. If that code is not there, we respond with an error message
  if (!req.query.code) {
    res.status(500)
    res.send({'Error': "Looks like we're not getting code."})
    console.log("Looks like we're not getting code.")
  } else {
        // If it's there...

        // We'll do a GET call to Slack's `oauth.access` endpoint, passing our app's client ID, client secret, and the code we just got as query parameters.
    request({
      url: 'https://slack.com/api/oauth.access', // URL to hit
      qs: {code: req.query.code, client_id: clientId, client_secret: clientSecret}, // Query string data
      method: 'GET' // Specify the method

    }, function (error, response, body) {
      if (error) {
        console.log(error)
      } else {
        res.json(body)
      }
    })
  }
})

// Route the endpoint that our slash command will point to and send back a simple response to indicate that ngrok is working
app.post('/command', function (req, res) {
  res.send('Your ngrok tunnel is up and running!')
})

// Mount the event handler on a route
// NOTE: you must mount to a path that matches the Request URL that was configured earlier
app.use('/events', slackEvents.expressMiddleware());

// Attach listeners to events by Slack Event "type". See: https://api.slack.com/events/message.im
// console.log(`Received a message event: user ${event.user} in channel ${event.channel} says ${event.text}`);
slackEvents.on('message', async (event)=> {
  // console.log('received event');
  // console.log(event);
  // build message object
  let messageObject = {}

  messageObject.ts = event.ts

  // Ge the message
  messageObject.message = event.text

  // Get the correct user name
  const users = await axios.get('https://slack.com/api/users.list', {
    params: {
      token: ACCESS_TOKEN
    }
  }).then(response => response.data.members)

  const user = users.find(user => user.id == event.user)
  messageObject.user_id = event.user
  messageObject.user_real_name = user.real_name

  // Get the correct channel name
  // Get public channels
  let publicChannels = await axios.get('https://slack.com/api/channels.list', {
    params: {
      token: ACCESS_TOKEN
    }
  }).then(response => response.data.channels)

  // Get private channels
  let privateChannels = await axios.get('https://slack.com/api/groups.list', {
    params: {
      token: ACCESS_TOKEN
    }
  }).then(response => response.data.groups)

  let foundPublicChannel = publicChannels.find(channel => channel.id == event.channel)
  if (foundPublicChannel) {
    messageObject.channel_id = foundPublicChannel.id
    messageObject.channel_real_name = foundPublicChannel.name
  }

  let foundPrivateChannel = privateChannels.find(channel => channel.id == event.channel)
  if (foundPrivateChannel) {
    messageObject.channel_id = foundPrivateChannel.id
    messageObject.channel_real_name = foundPrivateChannel.name
  }

  // Save to database
  saveMessage(messageObject)
});

const Database = require('./database')
const myDB = new Database()

function saveMessage(messageObject) {
  console.log('saving message: ', messageObject);
  myDB.insertMessage(messageObject, err => {
    if (err) {
      console.error(err);
    }
  })
}

// Handle errors (see `errorCodes` export)
slackEvents.on('error', console.error);
