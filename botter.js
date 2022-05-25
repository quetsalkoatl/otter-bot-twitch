var conf = require('./config.js');
const tmi = require('tmi.js');
// const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));


// Define configuration options
const opts = {
  identity: {
    username: conf.user,
    password: conf.token
  },
  channels: conf.channels
};

let discordRunning = false;

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
  "Hello from the otter side",
  "BROHAAA!! 💜"
];

const discordMessage = "* If you want to request a song or just hang out, join Jim's otter squad on Discord: https://discord.gg/nF5mPR5";
const uaMessage = "* If you want to donate to support the people in Ukraine visit https://www.supportukraine.co for a list of organizations 🇺🇦";

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
  if (user === 'streamlabs') {
    if (messg.includes("7D4KP5BYjX")) {
        client.say(target, "LINK CORRECTION: Join Jim's otter squad on Discord: https://discord.gg/nF5mPR5");
    }
    return;
  }
  
  if (messg.includes("!discord")) {
      client.say(target, "Join Jim's otter squad on Discord: https://discord.gg/nF5mPR5");
      return;
  }
   
  if (messg.includes("!song")) {
      fetchCurrentSongAndChat(target);
      return;
  }
  
  if (messg.includes("!ua")) {
      client.say(target, uaMessage);
      return;
  }

  if (messg.toLowerCase().includes('otter')) {
    const otterMsg = msgs[Math.floor(Math.random()*msgs.length)];
    client.say(target, `@${user}: ${otterMsg} 🦦`);
  } /*else if (messg.toLowerCase().includes('other')) {
      const otherMsg = messg.replace(/other/ig, 'otter');
      client.say(target, `@${user}, sorry to correct you: ${otherMsg} 🦦`);
  }*/
}

// Called every time the bot connects to Twitch chat
function onConnectedHandler (addr, port) {
  console.log(`* Connected to ${addr}:${port}`);
  if (!discordRunning) {
    discordRunning = true;
    discord();
  }
}

function discord() {
    setTimeout(function() {
        client.say(conf.channels[0], discordMessage);
        discord();
    }, conf.dcTimeout);
}

function fetchCurrentSongAndChat(target) {
  reloadConfig();
  if (!conf.ytPlaylistId) {
      client.say(target, "* Command currently not available!");
      return;
  }
  const ytUrl = `https://www.googleapis.com/youtube/v3/playlistItems?key=${conf.ytApiKey}&part=snippet&playlistId=${conf.ytPlaylistId}&maxResults=50`;
  fetch(ytUrl)
      .then(resp => resp.json())
      .then(json => {
          const items = json.items;
          if (json.items && json.items.length) {
              const last = items[items.length - 1].snippet;
              if (last && (last.title || (last.resourceId && last.resourceId.videoId))) {
                  let song = "";
                  if (last.title) {
                      song += `'${last.title}' `;
                  }
                  if (last.resourceId && last.resourceId.videoId) {
                      song += `(https://youtu.be/${last.resourceId.videoId})`;
                  }
                  client.say(target, `* We're currently listening to ${song}`);
                  return;
              }
          }
          client.say(target, "* Something went wrong 😭");
      })
      .catch(error => {
          console.log(error);
          client.say(target, "* Something went wrong 😭");
      });
}

function reloadConfig() {
    delete require.cache[require.resolve('./config.js')];
    conf = require('./config.js');
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
