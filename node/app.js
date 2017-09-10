/*
 * Copyright 2016-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

/* jshint node: true, devel: true */
'use strict';

const
  bodyParser = require('body-parser'),
  config = require('config'),
  crypto = require('crypto'),
  express = require('express'),
  https = require('https'),
  request = require('request');

var app = express();
app.set('port', process.env.PORT || 5000);
app.set('view engine', 'ejs');
app.use(bodyParser.json({ verify: verifyRequestSignature }));
app.use(express.static('public'));



//======================================================
//drug databse
var atorvastatin =
{
  title: "atorvastatin",
  subtitle: "take just one tablet once a day",
  buttons:
  [
    {
      title: "Delete",
      type: "postback",
      payload: "DELETEatorvastatin"
    }
  ]
}

var montelukast =
{
  title: "montelukast",
  subtitle: "take one tablet everyday in the evening",
  buttons:
  [
    {
      title: "Delete",
      type: "postback",
      payload: "DELETEmontelukast"
    }
  ]
}

var gemfibrozil =
{
  title: "gemfibrozil",
  subtitle: "take one tablet twice a day 30 minutes before breakfast and dinner",
  buttons:
  [
    {
      title: "Delete",
      type: "postback",
      payload: "DELETEgemfibrozil"
    }
  ]
}

var hydrochlorothiazide =
{
  title: "hydrochlorothiazide",
  subtitle: "take jsut one tablet everyday",
  buttons:
  [
    {
      title: "Delete",
      type: "postback",
      payload: "DELETEhydrochlorothiazide"
    }
  ]
}

var melatonin =
{
  title: "melatonin",
  subtitle: "take one tablet everyday at bed time",
  buttons:
  [
    {
      title: "Delete",
      type: "postback",
      payload: "DELETEmelatonin"
    }
  ]
}

//======================================================
//Reminder Elements
var messageA = "Take a pill once before bed time."

// var reminderElements = [ melatonin,hydrochlorothiazide ]
var reminderElements = [];
//======================================================
//user info
var name = 'Sam';//defalt name
var age = 25;
var holding_medicine = [];
var state = 0;
var temp_information = "";
var breafastTime = 9;
var lunchTime = 12;
var dinnerTime = 18;
var bedTime = 24;

var reminder_flag = 0;
var instruction_flag = 0;
var complication_flag = 0;
var symptom_flag = 0;
var fatal_flag = 0;

//======================================================

/*
 * Be sure to setup your config values before running this code. You can
 * set them using environment variables or modifying the config file in /config.
 *
 */

// App Secret can be retrieved from the App Dashboard
const APP_SECRET = (process.env.MESSENGER_APP_SECRET) ?
  process.env.MESSENGER_APP_SECRET :
  config.get('appSecret');

// Arbitrary value used to validate a webhook
const VALIDATION_TOKEN = (process.env.MESSENGER_VALIDATION_TOKEN) ?
  (process.env.MESSENGER_VALIDATION_TOKEN) :
  config.get('validationToken');

// Generate a page access token for your page from the App Dashboard
const PAGE_ACCESS_TOKEN = (process.env.MESSENGER_PAGE_ACCESS_TOKEN) ?
  (process.env.MESSENGER_PAGE_ACCESS_TOKEN) :
  config.get('pageAccessToken');

// URL where the app is running (include protocol). Used to point to scripts and
// assets located at this address.
const SERVER_URL = (process.env.SERVER_URL) ?
  (process.env.SERVER_URL) :
  config.get('serverURL');

if (!(APP_SECRET && VALIDATION_TOKEN && PAGE_ACCESS_TOKEN && SERVER_URL)) {
  console.error("Missing config values");
  process.exit(1);
}

/*
 * Use your own validation token. Check that the token used in the Webhook
 * setup is the same token used here.
 *
 */
app.get('/webhook', function(req, res) {
  if (req.query['hub.mode'] === 'subscribe' &&
      req.query['hub.verify_token'] === VALIDATION_TOKEN) {
    console.log("Validating webhook");
    res.status(200).send(req.query['hub.challenge']);
  } else {
    console.error("Failed validation. Make sure the validation tokens match.");
    res.sendStatus(403);
  }
});


app.on('listening', function () {
    // server ready to accept connections here

  // get_started:{
  //   payload:"<GET_STARTED_PAYLOAD>"
  // }
  // console.log("111. Get Started with messagingEvent");

});


/*
 * All callbacks for Messenger are POST-ed. They will be sent to the same
 * webhook. Be sure to subscribe your app to your page to receive callbacks
 * for your page.
 * https://developers.facebook.com/docs/messenger-platform/product-overview/setup#subscribe_app
 *
 */
app.post('/webhook', function (req, res) {
  var data = req.body;

  // Make sure this is a page subscription
  if (data.object == 'page') {
    // Iterate over each entry
    // There may be multiple if batched
    data.entry.forEach(function(pageEntry) {
      var pageID = pageEntry.id;
      var timeOfEvent = pageEntry.time;

      // Iterate over each messaging event
      pageEntry.messaging.forEach(function(messagingEvent) {
        if (messagingEvent.optin) {
          receivedAuthentication(messagingEvent);
        } else if (messagingEvent.message) {
          receivedMessage(messagingEvent);
        } else if (messagingEvent.delivery) {
          receivedDeliveryConfirmation(messagingEvent);
        } else if (messagingEvent.postback) {
          receivedPostback(messagingEvent);
        } else if (messagingEvent.read) {
          receivedMessageRead(messagingEvent);
        } else if (messagingEvent.account_linking) {
          receivedAccountLink(messagingEvent);
        } else if (messagingEvent.postback && messagingEvent.postback.payload) {
          // var payload = messagingEvent.postback.payload;
          // if (payload == "<GET_STARTED_PAYLOAD>") {
          //   setupReminders(res.receiptId);
          //   console.log("Get Started with messagingEvent: ", messagingEvent);

          // }
          // if (payload == "YES_PAYLOAD") {
          //   sendTextMessage(payload.receiptId, "Good boy/girl.")
          // } else if (payload == "NOT_PAYLOAD"){
          //   sendTextMessage(payload.receiptId, "Sure I don't even care anymore!")
          // } else if (payload == "DELETE_REMIND_PAYLOAD") {

          // }
      // Handle a payload from this sender
        } else {
          console.log("Webhook received unknown messagingEvent: ", messagingEvent);
        }
      });
    });

    // Assume all went well.
    //
    // You must send back a 200, within 20 seconds, to let us know you've
    // successfully received the callback. Otherwise, the request will time out.
    res.sendStatus(200);
  }
});

/*
 * This path is used for account linking. The account linking call-to-action
 * (sendAccountLinking) is pointed to this URL.
 *
 */
app.get('/authorize', function(req, res) {
  var accountLinkingToken = req.query.account_linking_token;
  var redirectURI = req.query.redirect_uri;

  // Authorization Code should be generated per user by the developer. This will
  // be passed to the Account Linking callback.
  var authCode = "1234567890";

  // Redirect users to this URI on successful login
  var redirectURISuccess = redirectURI + "&authorization_code=" + authCode;

  res.render('authorize', {
    accountLinkingToken: accountLinkingToken,
    redirectURI: redirectURI,
    redirectURISuccess: redirectURISuccess
  });
});

/*
 * Verify that the callback came from Facebook. Using the App Secret from
 * the App Dashboard, we can verify the signature that is sent with each
 * callback in the x-hub-signature field, located in the header.
 *
 * https://developers.facebook.com/docs/graph-api/webhooks#setup
 *
 */
function verifyRequestSignature(req, res, buf) {
  var signature = req.headers["x-hub-signature"];

  if (!signature) {
    // For testing, let's log an error. In production, you should throw an
    // error.
    console.error("Couldn't validate the signature.");
  } else {
    var elements = signature.split('=');
    var method = elements[0];
    var signatureHash = elements[1];

    var expectedHash = crypto.createHmac('sha1', APP_SECRET)
                        .update(buf)
                        .digest('hex');

    if (signatureHash != expectedHash) {
      throw new Error("Couldn't validate the request signature.");
    }
  }
}

/*
 * Authorization Event
 *
 * The value for 'optin.ref' is defined in the entry point. For the "Send to
 * Messenger" plugin, it is the 'data-ref' field. Read more at
 * https://developers.facebook.com/docs/messenger-platform/webhook-reference/authentication
 *
 */
function receivedAuthentication(event) {
  var senderID = event.sender.id;
  var recipientID = event.recipient.id;
  var timeOfAuth = event.timestamp;

  // The 'ref' field is set in the 'Send to Messenger' plugin, in the 'data-ref'
  // The developer can set this to an arbitrary value to associate the
  // authentication callback with the 'Send to Messenger' click event. This is
  // a way to do account linking when the user clicks the 'Send to Messenger'
  // plugin.
  var passThroughParam = event.optin.ref;

  console.log("Received authentication for user %d and page %d with pass " +
    "through param '%s' at %d", senderID, recipientID, passThroughParam,
    timeOfAuth);

  // When an authentication is received, we'll send a message back to the sender
  // to let them know it was successful.
  sendTextMessage(senderID, "Authentication successful");
}

/*
 * Message Event
 *
 * This event is called when a message is sent to your page. The 'message'
 * object format can vary depending on the kind of message that was received.
 * Read more at https://developers.facebook.com/docs/messenger-platform/webhook-reference/message-received
 *
 * For this example, we're going to echo any text that we get. If we get some
 * special keywords ('button', 'generic', 'receipt'), then we'll send back
 * examples of those bubbles to illustrate the special message bubbles we've
 * created. If we receive a message with an attachment (image, video, audio),
 * then we'll simply confirm that we've received the attachment.
 *
 */
function receivedMessage(event) {
  var senderID = event.sender.id;
  var recipientID = event.recipient.id;
  var timeOfMessage = event.timestamp;
  var message = event.message;

  console.log("Received message for user %d and page %d at %d with message:",
    senderID, recipientID, timeOfMessage);
  console.log(JSON.stringify(message));

  var isEcho = message.is_echo;
  var messageId = message.mid;
  var appId = message.app_id;
  var metadata = message.metadata;

  // You may get a text or attachment but not both
  var messageText = message.text;
  var messageAttachments = message.attachments;
  var quickReply = message.quick_reply;



  if (isEcho) {
    // Just logging message echoes to console
    console.log("Received echo for message %s and app %d with metadata %s",
      messageId, appId, metadata);
    return;
  } else if (quickReply) {
    var quickReplyPayload = quickReply.payload;
    console.log("Quick reply for message %s with payload %s",
      messageId, quickReplyPayload);
      if (quickReplyPayload == "YESTAKEN_PAYLOAD") {
        sendTextMessage(senderID, "That's my boy/girl!");
        return;
      } else if (quickReplyPayload == "NOTTAKEN_PAYLOAD") {
        sendTextMessage(senderID, "Tiffany will be sad :(.");
        return;
      }
      // else if (quickReplyPayload == "") {
      //   sendTextMessage(senderID, "Fine I don't even care anymore.");
      //   return;
      // } else if (quickReplyPayload == "") {
      //   sendTextMessage(senderID, "Fine I don't even care anymore.");
      //   return;
      // } else if (quickReplyPayload == "") {
      //   sendTextMessage(senderID, "Fine I don't even care anymore.");
      //   return;
      // }

    sendTextMessage(senderID, "Quick reply tapped");
    return;
  }

  if (messageText) {

    // If we receive a text message, check to see if it matches any special
    // keywords and send back the corresponding example. Otherwise, just echo
    // the text we received.
    switch (messageText) {
      case 'image':
        sendImageMessage(senderID);
        break;

      case 'gif':
        sendGifMessage(senderID);
        break;

      case 'audio':
        sendAudioMessage(senderID);
        break;

      case 'video':
        sendVideoMessage(senderID);
        break;

      case 'file':
        sendFileMessage(senderID);
        break;

      case 'button':
        sendButtonMessage(senderID);
        break;

      case '21218':
        sendGenericMessage(senderID);
        break;

      case 'receipt':
        sendReceiptMessage(senderID);
        break;

      case 'quick reply':
        sendQuickReply(senderID);
        break;

      case 'read receipt':
        sendReadReceipt(senderID);
        break;

      case 'typing on':
        sendTypingOn(senderID);
        break;

      case 'typing off':
        sendTypingOff(senderID);
        break;

      case 'account linking':
        sendAccountLinking(senderID);
        break;
      case 'give':
        sendReminderList(senderID);
        break;
      case 'add':
        addReminderList(senderID, gemfibrozil);
        break;
      case 'remove':
        removeReminderList(senderID, "med A");
        break;
      // case 'set breakfast':
      //   breakfastReminder(senderID);
      //   break;
      // case 'set bedtime':
      //   bedtimeReminder(senderID);
      //   break;
      // case 'set current':
      //   currentReminder(senderID);
      //   break;
      case 'add gemfibrozil':
        addReminderList(senderID, gemfibrozil);
        break
      case 'add hydrochlorothiazide':
        addReminderList(senderID, hydrochlorothiazide);
        break;
      case 'add melatonin':
        addReminderList(senderID, melatonin);
        break;
      case 'add montelukast':
        addReminderList(senderID, montelukast);
        break;
      case 'add atorvastatin':
        addReminderList(senderID, atorvastatin);
        break;
      case 'gglife':
        setupReminders(senderID);
        break;
      default:
        handleMessage(message, senderID)
        //sendTextMessage(senderID, "Sorry I don't understand!");
    }
  } else if (messageAttachments) {
    sendTextMessage(senderID, "Message with attachment received");
  }
}


/*
 * Delivery Confirmation Event
 *
 * This event is sent to confirm the delivery of a message. Read more about
 * these fields at https://developers.facebook.com/docs/messenger-platform/webhook-reference/message-delivered
 *
 */
function receivedDeliveryConfirmation(event) {
  var senderID = event.sender.id;
  var recipientID = event.recipient.id;
  var delivery = event.delivery;
  var messageIDs = delivery.mids;
  var watermark = delivery.watermark;
  var sequenceNumber = delivery.seq;

  if (messageIDs) {
    messageIDs.forEach(function(messageID) {
      console.log("Received delivery confirmation for message ID: %s",
        messageID);
    });
  }

  console.log("All message before %d were delivered.", watermark);
}


/*
 * Postback Event
 *
 * This event is called when a postback is tapped on a Structured Message.
 * https://developers.facebook.com/docs/messenger-platform/webhook-reference/postback-received
 *
 */
function receivedPostback(event) {
  var senderID = event.sender.id;
  var recipientID = event.recipient.id;
  var timeOfPostback = event.timestamp;

  // The 'payload' param is a developer-defined field which is set in a postback
  // button for Structured Messages.
  var payload = event.postback.payload;

  console.log("Received postback for user %d and page %d with payload '%s' " +
    "at %d", senderID, recipientID, payload, timeOfPostback);

  // When a postback is called, we'll send a message back to the sender to
  // let them know it was successful

  if (payload == "DELETEatorvastatin") {
      removeReminderList(senderID, "atorvastatin")
      sendTextMessage(senderID, "atorvastatin deleted");
      return;
  }
  if (payload == "DELETEmontelukast") {
      removeReminderList(senderID, "montelukast")
      sendTextMessage(senderID, "montelukast deleted");
      return;
  }
    if (payload == "DELETEgemfibrozil") {
      removeReminderList(senderID, "gemfibrozil")
      sendTextMessage(senderID, "gemfibrozil deleted");
      return;
  }
    if (payload == "DELETEhydrochlorothiazide") {
      removeReminderList(senderID, "hydrochlorothiazide")
      sendTextMessage(senderID, "hydrochlorothiazide deleted");
      return;
  }
    if (payload == "DELETEmelatonin") {
      removeReminderList(senderID, "melatonin")
      sendTextMessage(senderID, "melatonin deleted");
      return;
  }






//   atorvastatin
//   montelukast
//   gemfibrozil
// hydrochlorothiazide
// melatonin
  sendTextMessage(senderID, "Postback called");
}

/*
 * Message Read Event
 *
 * This event is called when a previously-sent message has been read.
 * https://developers.facebook.com/docs/messenger-platform/webhook-reference/message-read
 *
 */
function receivedMessageRead(event) {
  var senderID = event.sender.id;
  var recipientID = event.recipient.id;

  // All messages before watermark (a timestamp) or sequence have been seen.
  var watermark = event.read.watermark;
  var sequenceNumber = event.read.seq;

  console.log("Received message read event for watermark %d and sequence " +
    "number %d", watermark, sequenceNumber);
}

/*
 * Account Link Event
 *
 * This event is called when the Link Account or UnLink Account action has been
 * tapped.
 * https://developers.facebook.com/docs/messenger-platform/webhook-reference/account-linking
 *
 */
function receivedAccountLink(event) {
  var senderID = event.sender.id;
  var recipientID = event.recipient.id;

  var status = event.account_linking.status;
  var authCode = event.account_linking.authorization_code;

  console.log("Received account link event with for user %d with status %s " +
    "and auth code %s ", senderID, status, authCode);
  setupReminders(senderID);
}

/*
 * Send an image using the Send API.
 *
 */
function sendImageMessage(recipientId) {
  var messageData = {
    recipient: {
      id: recipientId
    },
    message: {
      attachment: {
        type: "image",
        payload: {
          url: SERVER_URL + "/assets/rift.png"
        }
      }
    }
  };

  callSendAPI(messageData);
}

/*
 * Send a Gif using the Send API.
 *
 */
function sendGifMessage(recipientId) {
  var messageData = {
    recipient: {
      id: recipientId
    },
    message: {
      attachment: {
        type: "image",
        payload: {
          url: SERVER_URL + "/assets/instagram_logo.gif"
        }
      }
    }
  };

  callSendAPI(messageData);
}

/*
 * Send audio using the Send API.
 *
 */
function sendAudioMessage(recipientId) {
  var messageData = {
    recipient: {
      id: recipientId
    },
    message: {
      attachment: {
        type: "audio",
        payload: {
          url: SERVER_URL + "/assets/sample.mp3"
        }
      }
    }
  };

  callSendAPI(messageData);
}

/*
 * Send a video using the Send API.
 *
 */
function sendVideoMessage(recipientId) {
  var messageData = {
    recipient: {
      id: recipientId
    },
    message: {
      attachment: {
        type: "video",
        payload: {
          url: SERVER_URL + "/assets/allofus480.mov"
        }
      }
    }
  };

  callSendAPI(messageData);
}

/*
 * Send a file using the Send API.
 *
 */
function sendFileMessage(recipientId) {
  var messageData = {
    recipient: {
      id: recipientId
    },
    message: {
      attachment: {
        type: "file",
        payload: {
          url: SERVER_URL + "/assets/test.txt"
        }
      }
    }
  };

  callSendAPI(messageData);
}

/*
 * Send a text message using the Send API.
 *
 */
function sendTextMessage(recipientId, messageText) {
  history_record ("Medbot", messageText);
  var messageData = {
    recipient: {
      id: recipientId
    },
    message: {
      text: messageText,
      metadata: "DEVELOPER_DEFINED_METADATA"
    }
  };

  callSendAPI(messageData);
}

/*
 * Send a button message using the Send API.
 *
 */
function sendButtonMessage(recipientId) {
  var messageData = {
    recipient: {
      id: recipientId
    },
    message: {
      attachment: {
        type: "template",
        payload: {
          template_type: "button",
          text: "This is test text",
          buttons:[{
            type: "web_url",
            url: "https://www.oculus.com/en-us/rift/",
            title: "Open Web URL"
          }, {
            type: "postback",
            title: "Trigger Postback",
            payload: "DEVELOPER_DEFINED_PAYLOAD"
          }, {
            type: "phone_number",
            title: "Call Phone Number",
            payload: "+16505551234"
          }]
        }
      }
    }
  };

  callSendAPI(messageData);
}

/*
 * Send a Structured Message (Generic Message type) using the Send API.
 *
 */
function sendGenericMessage(recipientId) {
  var messageData = {
    recipient: {
      id: recipientId
    },
    message: {
      attachment: {
        type: "template",
        payload: {
          template_type: "generic",
          elements: [{
            title: "CVS",
            subtitle: "Pharmacy around here",
            item_url: "https://www.google.com/maps/place/CVS/@39.3265503,-76.6173887,16.25z/data=!4m8!1m2!2m1!1scvs!3m4!1s0x0:0xfd03a32baea05606!8m2!3d39.3271937!4d-76.6161874?hl=en",
            image_url: SERVER_URL + "/assets/21218_cvs.png",
            buttons: [{
              type: "web_url",
              url: "https://www.google.com/maps/place/CVS/@39.3265503,-76.6173887,16.25z/data=!4m8!1m2!2m1!1scvs!3m4!1s0x0:0xfd03a32baea05606!8m2!3d39.3271937!4d-76.6161874?hl=en",
              title: "Open Googel Map"
            } ],

          }]
        }
      }
    }
  };

  callSendAPI(messageData);
}

/*
 * Send a receipt message using the Send API.
 *
 */
function sendReceiptMessage(recipientId) {
  // Generate a random receipt ID as the API requires a unique ID
  var receiptId = "order" + Math.floor(Math.random()*1000);

  var messageData = {
    recipient: {
      id: recipientId
    },
    message:{
      attachment: {
        type: "template",
        payload: {
          template_type: "receipt",
          recipient_name: "Peter Chang",
          order_number: receiptId,
          currency: "USD",
          payment_method: "Visa 1234",
          timestamp: "1428444852",
          elements: [{
            title: "Oculus Rift",
            subtitle: "Includes: headset, sensor, remote",
            quantity: 1,
            price: 599.00,
            currency: "USD",
            image_url: SERVER_URL + "/assets/riftsq.png"
          }, {
            title: "Samsung Gear VR",
            subtitle: "Frost White",
            quantity: 1,
            price: 99.99,
            currency: "USD",
            image_url: SERVER_URL + "/assets/gearvrsq.png"
          }],
          address: {
            street_1: "1 Hacker Way",
            street_2: "",
            city: "Menlo Park",
            postal_code: "94025",
            state: "CA",
            country: "US"
          },
          summary: {
            subtotal: 698.99,
            shipping_cost: 20.00,
            total_tax: 57.67,
            total_cost: 626.66
          },
          adjustments: [{
            name: "New Customer Discount",
            amount: -50
          }, {
            name: "$100 Off Coupon",
            amount: -100
          }]
        }
      }
    }
  };

  callSendAPI(messageData);
}

/*
 * Send a message with Quick Reply buttons.
 *
 */
function sendQuickReply(recipientId) {
  var messageData = {
    recipient: {
      id: recipientId
    },
    message: {
      text: "What's your favorite movie genre?",
      quick_replies: [
        {
          "content_type":"text",
          "title":"Action",
          "payload":"DEVELOPER_DEFINED_PAYLOAD_FOR_PICKING_ACTION"
        },
        {
          "content_type":"text",
          "title":"Comedy",
          "payload":"DEVELOPER_DEFINED_PAYLOAD_FOR_PICKING_COMEDY"
        },
        {
          "content_type":"text",
          "title":"Drama",
          "payload":"DEVELOPER_DEFINED_PAYLOAD_FOR_PICKING_DRAMA"
        }
      ]
    }
  };

  callSendAPI(messageData);
}

/*
 * Send a read receipt to indicate the message has been read
 *
 */
function sendReadReceipt(recipientId) {
  console.log("Sending a read receipt to mark message as seen");

  var messageData = {
    recipient: {
      id: recipientId
    },
    sender_action: "mark_seen"
  };

  callSendAPI(messageData);
}

/*
 * Turn typing indicator on
 *
 */
function sendTypingOn(recipientId) {
  console.log("Turning typing indicator on");

  var messageData = {
    recipient: {
      id: recipientId
    },
    sender_action: "typing_on"
  };

  callSendAPI(messageData);
}

/*
 * Turn typing indicator off
 *
 */
function sendTypingOff(recipientId) {
  console.log("Turning typing indicator off");

  var messageData = {
    recipient: {
      id: recipientId
    },
    sender_action: "typing_off"
  };

  callSendAPI(messageData);
}

/*
 * Send a message with the account linking call-to-action
 *
 */
function sendAccountLinking(recipientId) {
  var messageData = {
    recipient: {
      id: recipientId
    },
    message: {
      attachment: {
        type: "template",
        payload: {
          template_type: "button",
          text: "Welcome. Link your account.",
          buttons:[{
            type: "account_link",
            url: SERVER_URL + "/authorize"
          }]
        }
      }
    }
  };

  callSendAPI(messageData);
}

function sendReminderList(recipientId) {

  if (reminderElements.length > 1) {
    var messageData = {
      recipient:{
        id: recipientId
    },
      message: {
        attachment: {
          type: "template",
          payload: {
            template_type: "list",
            top_element_style: "compact",
            elements: reminderElements
          }
        }
      }

    };

    callSendAPI(messageData);
  } else {
    sendTextMessage(recipientId, "Not enough items in the list");
  }
}


function addReminderList(recipientId, newElement) {

  if (reminderElements.includes(newElement)) {
    sendTextMessage(recipientId, "Already in your reminder!");
    return
  }
  reminderElements.push(newElement)

  if (reminderElements.length > 1 ) {
    var messageData = {
      recipient:{
        id: recipientId
    },
      message: {
        attachment: {
          type: "template",
          payload: {
            template_type: "list",
            top_element_style: "compact",
            elements: reminderElements,
          }
        }
      }


    };

    callSendAPI(messageData);
  }
}

function removeReminderList(recipientId, MedicineName) {


  var index = reminderElements.findIndex(function(o){
       return o.title === MedicineName;
  })
  if (index !== -1) reminderElements.splice(index, 1);


  var messageData = {
    recipient:{
      id: recipientId
  },
    message: {
      attachment: {
        type: "template",
        payload: {
          template_type: "list",
          top_element_style: "compact",
          elements: reminderElements,
        }
      }
    }

  };

  callSendAPI(messageData);
}



function setupReminders(recipientId) {
  var currentdate = new Date();
  var currentttime = currentdate.getHours()*60*60*1000 + currentdate.getMinutes()*60*1000
  // var datetime = "Last Sync: " + currentdate.getDate() + "/"
  //                 + (currentdate.getMonth()+1)  + "/"
  //                 + currentdate.getFullYear() + " @ "
  //                 + currentdate.getHours() + ":"
  //                 + currentdate.getMinutes() + ":"
  //               + currentdate.getSeconds();

//   var breakfast_offset = var breafastTime = 9;
// var lunchTime = 12;
// var dinnerTime = 18;
// var bedTime = 24;

  var breakfast_offset = currentttime - breafastTime*60*60*1000
  var lunch_offset = currentttime - lunchTime*60*60*1000
  var dinner_offset = currentttime - dinnerTime*60*60*1000
  var bed_offset = currentttime - bedTime*60*60*1000

  // setTimeout(reminderInterrrupt, 3000 + i*3*1000, recipientId);


  // setInterval(reminderInterrrupt, breakfast_offset + 24*60*60*1000, recipientId, "breakfast");
  // setInterval(reminderInterrrupt, lunch_offset + 24*60*60*1000, recipientId, "lunch");
  // setInterval(reminderInterrrupt, dinner_offset + 24*60*60*1000, recipientId, "dinner");
  // setInterval(reminderInterrrupt, bed_offset + 24*60*60*1000, recipientId, "bed time");

  // breakfast_offset = 0;
  // setTimeout(startMealReminder, 0, recipientId, "breakfast");
  //   setTimeout(startMealReminder, 0, recipientId, "bed time");


  bed_offset = 10;
  setTimeout(startMealReminder, breakfast_offset, recipientId, "breakfast");
  setTimeout(startMealReminder, lunch_offset, recipientId, "lunch");
  setTimeout(startMealReminder, dinner_offset, recipientId, "dinner");
  setTimeout(startMealReminder, bed_offset, recipientId, "bed time");
  // for (var i = 0; i < 3; i++) {

  //   setTimeout(reminderInterrrupt, 3000 + i*3*1000, recipientId);
  // }
}
function startMealReminder (recipientId, whichMeal) {
  // if (whichMeal == "breakfast") {
  //   setInterval(reminderInterrrupt, 5*1000, recipientId, whichMeal);
  //   return;
  // }
  //   if (whichMeal == "bed time") {
  //   setInterval(reminderInterrrupt, 10*1000, recipientId, whichMeal);
  //   return;
  // }


  setInterval(reminderInterrrupt, 24*60*60*1000, recipientId, whichMeal);
}


function bedtimeReminder(recipientId) {
}
function currentReminder(recipientId) {
}


/*
 * Call the Send API. The message data goes in the body. If successful, we'll
 * get the message id in a response
 *
 */
function callSendAPI(messageData) {
  request({
    uri: 'https://graph.facebook.com/v2.6/me/messages',
    qs: { access_token: PAGE_ACCESS_TOKEN },
    method: 'POST',
    json: messageData

  }, function (error, response, body) {
    if (!error && response.statusCode == 200) {
      var recipientId = body.recipient_id;
      var messageId = body.message_id;

      if (messageId) {
        console.log("Successfully sent message with id %s to recipient %s",
          messageId, recipientId);
      } else {
      console.log("Successfully called Send API for recipient %s",
        recipientId);
      }
    } else {
      console.error("Failed calling Send API", response.statusCode, response.statusMessage, body.error);
    }
  });
}

// Start server
// Webhooks must be available via SSL with a certificate signed by a valid
// certificate authority.
app.listen(app.get('port'), function() {
  console.log('Node app is running on port', app.get('port'));

});

module.exports = app;

function firstEntity(nlp, name) {
  return nlp && nlp.entities && nlp.entities && nlp.entities[name] && nlp.entities[name][0];
}

function handleMessage(message, senderID) {
  // check greeting is here and is confident

  const greeting = firstEntity(message.nlp, 'greeting');
  const say_goodbye = firstEntity(message.nlp, 'say_goodbye');

  const name = firstEntity(message.nlp, 'name');

  const medicine = firstEntity(message.nlp, 'medicine');
  const reminder_func = firstEntity(message.nlp, 'reminder_func');
  const instruction_func = firstEntity(message.nlp, 'instruction_func');
  const complication_func = firstEntity(message.nlp, 'complication_func');
  const symptom_func = firstEntity(message.nlp, 'symptom_func');
  const fatal_event = firstEntity(message.nlp, 'fatal_event');

  const exp_confidence = 0.75;

  history_record ("User", message.text);

  if (greeting && greeting.confidence > exp_confidence) {
    sendTextMessage(senderID, "Hi, pal!");
  }else if (say_goodbye && say_goodbye.confidence > exp_confidence ){
    sendTextMessage(senderID, "See you next time!:");
  }
  //====================================================================
  else if (name && name.confidence > exp_confidence ){
    sendTextMessage(senderID, "nice to know you! ");

  }


  //====================================================================
  else if (medicine && medicine.confidence > exp_confidence && reminder_func && reminder_func.confidence > exp_confidence ){
    // sendTextMessage(senderID, "Sure, your reminder schedule will be:");
    sendTextMessage(senderID, "Sure!");
    var theMed = whichMed (medicine.value);
    addReminderList(senderID, theMed);


    //

    reminder_flag = 2;
  }else if (medicine && medicine.confidence > exp_confidence && instruction_func && instruction_func.confidence > exp_confidence ){
    add_medicine(medicine.value);
    sendTextMessage(senderID, "Sure, the instruction is "+search_data(medicine.value,7));
    sendImageMessage_multi(senderID,medicine.value);
    instruction_flag = 2;
  }else if (medicine && medicine.confidence > exp_confidence && complication_func && complication_func.confidence > exp_confidence ){
    add_medicine(medicine.value);
    sendTextMessage(senderID, "Sure, the complication may include: "+search_data(medicine.value,6));
    complication_flag = 2;
  }else if (medicine && medicine.confidence > exp_confidence && symptom_func && symptom_func.confidence > exp_confidence ){
    add_medicine(medicine.value);
    sendTextMessage(senderID, "you may have the following symptoms: "+search_data(medicine.value,10));
    symptom_flag =2;
  }else if(medicine && medicine.confidence > exp_confidence && fatal_event && fatal_event.confidence > exp_confidence){
    add_medicine(medicine.value);
    sendTextMessage(senderID, "Take a look, you probabaly may have the following severe adverse event: "+search_data(medicine.value,11));
    fatal_flag =2;

  }else if (medicine && medicine.confidence > exp_confidence){
    add_medicine(medicine.value);
    if (reminder_flag ==1){
      //sendTextMessage(senderID, "Sure, your reminder schedule will be:");
    //
  sendTextMessage(senderID, "Sure!");
  var theMed = whichMed (medicine.value);
    addReminderList(senderID, theMed);
    reminder_flag = 2;
    }else if(instruction_flag == 1){
      sendTextMessage(senderID, "Sure, the instruction is "+search_data(holding_medicine[holding_medicine.length-1],7));
      sendImageMessage_multi(senderID,holding_medicine[holding_medicine.length-1]);
      instruction_flag = 2;
    }else if(complication_flag == 1){
      sendTextMessage(senderID, "Sure, the complication may include: "+search_data(holding_medicine[holding_medicine.length-1],6));
      complication_flag = 2;
    }else if (symptom_flag == 1){
      sendTextMessage(senderID, "you may have the following symptoms: "+search_data(holding_medicine[holding_medicine.length-1],10));
      symptom_flag = 2;
    }else if (fatal_flag == 1){
      sendTextMessage(senderID, "Take a look, you probabaly may have the following severe adverse event: "+search_data(holding_medicine[holding_medicine.length-1],11));
      fatal_flag =2;
    }else{
      sendTextMessage(senderID, "Yeah, and do you want to set up a reminder or get the instruction?");
    }
  }else if (reminder_func && reminder_func.confidence > exp_confidence){
    if (holding_medicine.length > 0){
      //sendTextMessage(senderID, "Sure, your reminder schedule will be:");
      sendTextMessage(senderID, "Sure!");
      var theMed = whichMed (medicine.value);
    addReminderList(senderID, theMed);
      //
      reminder_flag = 2;
    }else{
    sendTextMessage(senderID, "Which medicine?");
    reminder_flag = 1;
    }
  }else if (instruction_func && instruction_func.confidence > exp_confidence){
    if (holding_medicine.length > 0){
      sendTextMessage(senderID, "Sure, the instruction is "+search_data(holding_medicine[holding_medicine.length-1],7));
      sendImageMessage_multi(senderID,holding_medicine[holding_medicine.length-1]);
      instruction_flag = 2;
    }else{
    sendTextMessage(senderID, "Which medicine?");
    instruction_flag = 1;
    }
  }else if (complication_func && complication_func.confidence > exp_confidence){
    if (holding_medicine.length > 0){
      sendTextMessage(senderID, "Sure, the complication may include: "+search_data(holding_medicine[holding_medicine.length-1],11));
      complication_flag = 2;
    }else{
    sendTextMessage(senderID, "Which medicine?");
    complication_flag = 1;
    }
  }else if (symptom_func && symptom_func.confidence > exp_confidence){
    if (holding_medicine.length > 0){
      sendTextMessage(senderID, "you may have the following symptoms: "+search_data(holding_medicine[holding_medicine.length-1],10));
      symptom_flag = 2;
    }else{
    sendTextMessage(senderID, "Which medicine?");
    symptom_flag = 1;
    }
  }else if(fatal_event && fatal_event.confidence > exp_confidence){
    if (holding_medicine.length > 0){
      sendTextMessage(senderID, "Take a look, you probabaly may have the following severe adverse event: "+search_data(holding_medicine[holding_medicine.length-1],11));
      fatal_flag =2;
    }else{
    sendTextMessage(senderID, "Which medicine?");
    fatal_flag = 1;
    }
  }else {
    sendTextMessage(senderID, "Sorry, I don't understand your words! Could you be more specific?")
  }
}

function search_data(generic_name, information) {
  var fs = require('fs');
var array = fs.readFileSync('./data.txt').toString().split('*');
/*
for(var i =0; i<array.length; i++) {
    console.log(array[i]);
    console.log(array.length);
}
*/

for (var i = 0; i < 2; i++){
  for (var j = 0; j <45; j=j+11){

    if (generic_name===array[i+j]){
      return array[parseInt((i+j)/11)*11-1+information];
    }
  }
}



}

function sendImageMessage_multi(recipientId, name_medicine) {
  var fs = require('fs');
  var array = fs.readFileSync('./data.txt').toString().split('*');

  var pic_name = "";
for (var i = 0; i < 2; i++){
  for (var j = 0; j <45; j=j+11){

    if (name_medicine===array[i+j]){
      pic_name = array[parseInt((i+j)/11)*11-1+9];
    }
  }
}


  console.log(pic_name);
  var messageData = {
    recipient: {
      id: recipientId
    },
    message: {
      attachment: {
        type: "image",
        payload: {
          url: SERVER_URL + "/assets/" + pic_name
        }
      }
    }
  };

  callSendAPI(messageData);
}


function add_medicine(name_medicine){
var flag = 0;
  for (var i = 0; i < holding_medicine.length; i++){
    if (holding_medicine[i]===name_medicine){
      flag = 1;
      break;
    }
  }
  if (flag != 1){
    holding_medicine.push(name_medicine);
  }
  console.log(holding_medicine.length);
}

function history_record (sender_ID, input){
  var fs = require('fs');

fs.appendFile('./test.txt', getDateTime() + " " + sender_ID +" : " + input + "\n", function (err) {
    if (err)
        console.log(err);
    else
        console.log('Append operation complete.');
});

}

function getDateTime() {

    var date = new Date();

    var hour = date.getHours();
    hour = (hour < 10 ? "0" : "") + hour;

    var min  = date.getMinutes();
    min = (min < 10 ? "0" : "") + min;

    var sec  = date.getSeconds();
    sec = (sec < 10 ? "0" : "") + sec;

    var year = date.getFullYear();

    var month = date.getMonth() + 1;
    month = (month < 10 ? "0" : "") + month;

    var day  = date.getDate();
    day = (day < 10 ? "0" : "") + day;

    return year + ":" + month + ":" + day + ":" + hour + ":" + min + ":" + sec;

}


function reminderInterrrupt (recipientId, whichMeal) {
  // var currentdate = new Date();
  // var datetime = "Last Sync: " + currentdate.getDate() + "/"
  //                 + (currentdate.getMonth()+1)  + "/"
  //                 + currentdate.getFullYear() + " @ "
  //                 + currentdate.getHours() + ":"
  //                 + currentdate.getMinutes() + ":"
  //                 + currentdate.getSeconds();

  // if (reminderElements.length < 2) {
  //   return 0;
  // }

  // if (whichMeal == "current") {
  //   whichMeal = "just"
  // }

  var ReminderMeds  = reminderElements.filter(function(o){return o.subtitle.includes(whichMeal)});



  // var aMed;
  // for (aMed in ReminderMeds) {
  //   aMed.duration = aMed.duration - 1;
  //   if (aMed.duration == 0) {
  //     removeReminderList(recipientId, aMed.title);
  //   }
  // }

  var takeMedString = "You should've taken your med by now. Did you take it?";

  var messageData = {
    recipient: {
      id: recipientId
    },
    message: {
      text: takeMedString,

      quick_replies: [
        {
          "content_type":"text",
          "title":"Yes",
          "payload":"YESTAKEN_PAYLOAD"
        },
        {
          "content_type":"text",
          "title":"Sorry no :(",
          "payload":"NOTTAKEN_PAYLOAD"
        }
      ]
    }
  };

  callSendAPI(messageData);
}


function whichMed (name) {

  if (name === "melatonin") {
      console.log("melatonin detected");

    return melatonin;
  }
  if (name === "hydrochlorothiazide") {
      console.log("hydrochlorothiazide detected");

    return hydrochlorothiazide;
  }
  if (name === "gemfibrozil") {
    return gemfibrozil;
  }
  if (name === "montelukast") {
    return montelukast;
  }
  if (name === "atorvastatin") {
    return atorvastatin;
  }
  console.log("Not med detected for %s", name);

}