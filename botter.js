const conf = require('./config.js');
const tmi = require('tmi.js');

// Define configuration options
const opts = {
  identity: {
    username: conf.user,
    password: conf.token
  },
  channels: conf.channels
};

const msgs = [
  "You called me?",
  "Just checking in to say hello!",
  "I hope I'm not bottering you.",
  "Thou hast awoken me from mine slumber!",
  "Guess who's back, back again! bOtter's back, tell a friend!",
  "Well hello there!",
  "Never gonna give you up, never gonna let you down.",
  "Hello my seaster or brotter <3",
  "Whazzzzuuuuuup?",
  "👋 Hi",
  "bOtter reporting for duty!",
  "You are my favourite member of the communtity. Along with everyone else.",
  "Your music taste is impeccable!",
  "Sing my angel of music 🎶",
  "Somewhere over the rainbow otters sing",
  "Hello from the otter side"
];

const discordMessage = "* Join Jim's otter squad on Discord: https://discord.gg/nF5mPR5";

// Create a client with our options
const client = new tmi.client(opts);

// Register our event handlers (defined below)
// All emitted events can be found here: https://github.com/tmijs/tmi.js/blob/master/lib/client.js
client.on('message', onMessageHandler);
client.on('connected', onConnectedHandler);
client.on('sub', onSubHandler);
client.on('resub', onResubHandler);
client.on('subgift', onSubgiftHandler);
client.on('cheer', onCheerHandler);

// Connect to Twitch:
client.connect();

// Called every time a message comes in
function onMessageHandler (target, context, msg, self) {
  if (self) { return; } // Ignore messages from the bot

  // Remove whitespace from chat message
  const messg = msg.trim();
  const user = context.username;
  //console.log(`'${user}'`);
  if (user === 'streamlabs') {
    if (messg.includes("7D4KP5BYjX")) {
        client.say(target, "LINK CORRECTION: Join Jim's otter squad on Discord: https://discord.gg/nF5mPR5");
    }
    return;
  }

  /*if (messg.toLowerCase() == "!discord") {
      client.say(target, discordMessage);
      return;
  }*/

  // return;

  // If the command is known, let's execute it
  if (messg.toLowerCase().includes('otter')) {
    const otterMsg = msgs[Math.floor(Math.random()*msgs.length)];
    client.say(target, `@${user}: ${otterMsg} 🦦`);
  } /*else if (messg.toLowerCase().includes('other')) {
      const otherMsg = messg.replace(/other/ig, 'otter');
      client.say(target, `@${user}, sorry to correct you: ${otherMsg} 🦦`);
  }*/
}

function onSubHandler(channel, user, methods, msg, tags) {
    console.log('------ SUB ------');
    console.log('channel', channel);
    console.log('user', user);
    console.log('methods', methods);
    console.log('msg', msg);
    console.log('tags', tags);
}

function onResubHandler(channel, user, streak, msg, tags, methods) {
    console.log('------ RESUB ------');
    console.log('channel', channel);
    console.log('user', user);
    console.log('streak', streak);
    console.log('msg', msg);
    console.log('tags', tags);
    console.log('methods', methods);
}

function onSubgiftHandler(channel, user, streak, recipient, methods, tags) {
    console.log('------ SUBGIFT ------');
    console.log('channel', channel);
    console.log('user', user);
    console.log('streak', streak);
    console.log('recipient', recipient);
    console.log('methods', methods);
    console.log('tags', tags);
}

function onCheerHandler(channel, tags, msg) {
    console.log('------ CHEER ------');
    console.log('channel', channel);
    console.log('tags', tags);
    console.log('msg', msg);
}

// Called every time the bot connects to Twitch chat
function onConnectedHandler (addr, port) {
  console.log(`* Connected to ${addr}:${port}`);
  discord();
}

function discord() {
    setTimeout(function() {
        client.say(conf.channels[0], discordMessage);
        discord();
    }, conf.dcTimeout);
}