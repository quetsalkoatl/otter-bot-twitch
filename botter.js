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

const esc = {};
let escVoting = undefined;
const escAdmins = ["quetsalkoatl", "cabbagedynamite"];

let discordRunning = false;
const discordWait = 3;
let discordWaitCurrent = 0;
let discordWaitLimit = 30 * 60 * 1000; // 30 minutes

const msgs = [
  "You called me?",
  "Just checking in to say hello!",
  "I hope I'm not bottering you.",
  "Thou hast awoken me from mine slumber!",
  "Guess who's back, back again! Botter's back, tell a friend!",
  "Well hello there!",
  "Never gonna give you up, never gonna let you down.",
  "Hello my seaster or brotter <3",
  "Whazzzzuuuuuup?",
  "👋 Hi",
  "Botter reporting for duty!",
  "You are my favourite member of the communtity. Along with everyone else.",
  "Your music taste is impeccable!",
  "Sing my angel of music 🎶",
  "Somewhere over the rainbow otters sing",
  "Hello from the otter side",
  "Borahae!! 💜"
];

const globalChat = [];
const botterChat = [];

const discordMessage = `* If you want to request a song or just hang out, join Jim's otter squad on Discord: ${conf.discord}`;

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
  
  queueAdd(globalChat, 20, { user, message: messg });
  
  discordWaitCurrent--;
  
  if (false) {
    if (escVote(messg, user, target)) {
      return;
    }
  }
  
  if (isUserMe(user) && messg === "!play") {
    client.say(target, "!play");
    return;
  }
  
  if (messg.includes("!discord")) {
    client.say(target, `* Join Jim's otter squad on Discord: ${conf.discord}`);
    return;
  }
  
  if (messg.includes("!request") || messg.includes("!sr")) {
    client.say(target, `* Requests are closed right now. They usually open two hours before the stream on Discord. If you join the Discord you'll be notified when and how to request. ${conf.discord}`);
    return;
  }
  
  if (!isUserMe(user) && messg.includes("https://") && (messg.includes("youtube.com") || messg.includes("youtu.be"))) {
    client.say(target, `* Requests are closed right now. They usually open two hours before the stream on Discord. If you join the Discord you'll be notified when and how to request. ${conf.discord} @${user}`);
    return;
  }
   
  if (messg.includes("!song")) {
    fetchCurrentSongAndChat(target);
    return;
  }
  
  if (messg.toLowerCase().includes("@botterchatslive")) {
      chatGPT(target, user, messg);
      return;
  }

  if (messg.toLowerCase().includes('otter')) {
    const otterMsg = msgs[Math.floor(Math.random()*msgs.length)];
    client.say(target, `@${user}: ${otterMsg} 🦦`);
  } else if (conf.otherEnabled && messg.toLowerCase().includes('other')) {
    const otherMsg = messg.replace(/other/ig, 'otter');
    client.say(target, `@${user}, sorry to correct you: ${otherMsg} 🦦`);
  }
}

function isUserMe(user) {
  return user?.toLowerCase() === conf.myUserName;
}

function escVote(messg, user, target) {
  if (escAdmins.includes(user?.toLowerCase())) {
      if (messg.startsWith("!esc vote ")) {
        escVoting = messg.replace("!esc vote ", "");
        esc[escVoting] = {};
        console.log(esc);
        client.say(target, "* Voting for the current song is now open! Vote with '!esc x', where x is your rating from 1-10 (only whole numbers). You can vote multiple times but only the most recent one counts");
        return true;
      }
      
      if (messg.startsWith("!esc ex")) {
        console.log(esc);
        client.say(target, "* Vote with '!esc x', where x is your rating from 1-10 (only whole numbers). You can vote multiple times but only the most recent one counts");
        return true;
      }
      
      if (messg === "!esc close") {
        escVoting = undefined;
        console.log(esc);
        client.say(target, "* Voting is closed!");
        return true;
      }
      
      if (messg === "!esc stats") {
        const arr = Object.entries(esc).reduce((acc, [k, v]) => {
          let cnt = 0;
          let sum = 0;
          Object.values(v).forEach((vote) => {
            cnt++;
            sum += vote;
          });
          if (cnt !== 0) {
            let avg = sum / cnt;
            acc.push({ name: k , cnt, avg });
          }
          return acc;
        }, []);
        arr.sort((a, b) => b.avg - a.avg);
        const stats = arr.reduce((acc, {name, cnt, avg}) => {
          const avgStr = avg.toString().substring(0, 6);
          return `${acc}${acc ? ' / ' : ''}${name}: ${avgStr} (${cnt})`;
        }, "");
        client.say(target, stats);
        return true;
      }
  }
  
  if (messg.startsWith("!esc")) {
    if (escVoting) {
      const voteRaw = messg.replace("!esc ", "");
      const vote = Number.isInteger(+voteRaw) ? +voteRaw : 0;
      if (vote >= 1 && vote <= 10) {
        esc[escVoting][user] = vote;
        console.log(esc);
      } else {
        client.say(target, `* @${user}: invalid vote '${voteRaw}'`);
      }
    } else {
      client.say(target, `* @${user}: voting is currently closed!`);
    }
    return;
  }
}

const currentMessage = '[current_message]';
const botterHistory = '[botter_history]';
const globalHistory = '[global_history]';
function chatGPT(target, user, message) {
  if (!conf.openAIKey || !conf.openAIProject) {
      return;
  }
  const data = {
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: `You are a bot on Twitch called BotterChatsLive. Respond to the message in a very friendly and funny way and less than 50 words. The user you're responding to is called ${user}. You're on channel called JimGamesLive and we're watching music reactions.`,
      },
      {
        role: 'system',
        content: `There are 3 different types of messages provided to you. The first type starts with ${currentMessage} and is the current message you should answer to. This is the most important message. The second type starts with ${botterHistory} and a number for chronological order, these are your conversation history. The third type starts with ${globalHistory} and a number for chronological order, these are the last messages in chat not directly directed at you and are just so you know the current discussion context.`,
      },
      {
        role: 'user',
        name: user,
        content: `${currentMessage}${message}`,
      },
      ...botterChat.map(({user, message}, idx) => ({ role: 'user', name: user, content: `${botterHistory}${idx+1}: ${message}` })),
      ...globalChat.map(({user, message}, idx) => ({ role: 'user', name: user, content: `${globalHistory}${idx+1}: ${message}` })),
    ],
  };
  const request = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${conf.openAIKey}`,
      'OpenAI-Project': conf.openAIProject,
    },
    body: JSON.stringify(data),
  };
  
  queueAdd(botterChat, 20, { user, message });
  
  fetch('https://api.openai.com/v1/chat/completions', request)
    .then(resp => resp.json())
    .then(json => {
        const resp = json?.choices?.[0]?.message?.content;
        if (!!resp) {
          const atUser = `@${user}`;
          const cleanResp = resp.startsWith(atUser) ? resp.replace(atUser, '') : resp;
          client.say(target, `${atUser} ${cleanResp} 🦦`);
          queueAdd(botterChat, 20, { user: 'BotterChatsLive', message: cleanResp });
        } else {
            console.log(json);
        }
    });
}

// Called every time the bot connects to Twitch chat
function onConnectedHandler (addr, port) {
  console.log(`* Connected to ${addr}:${port}`);
  if (!discordRunning) {
    discordRunning = true;
    discord();
    discordWaitStop();
  }
}

function discord() {
  setTimeout(function() {
    if (discordWaitCurrent < 1) {
      client.say(conf.channels[0], discordMessage);
      discordWaitCurrent = discordWait;
    }
    discord();
  }, conf.dcTimeout);
}

function discordWaitStop() {
  setTimeout(function() {
    discordWaitCurrent = 0;
    discordWaitStop();
  }, discordWaitLimit);
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
      if (json.items?.length) {
        const last = items[items.length - 1].snippet;
        if (last?.title || last?.resourceId?.videoId) {
          let song = "";
          if (last.title) {
            song += `'${last.title}' `;
          }
          if (last.resourceId?.videoId) {
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

function queueAdd(array, maxSize, el) {
    if (array.length >= maxSize) {
        array.shift();
    }
    array.push(el);
}

function onSubHandler(channel, user, methods, msg, tags) {
  //console.log('------ SUB ------');
  //console.log('channel', channel);
  //console.log('user', user);
  //console.log('methods', methods);
  //console.log('msg', msg);
  //console.log('tags', tags);
}

function onResubHandler(channel, user, streak, msg, tags, methods) {
  //console.log('------ RESUB ------');
  //console.log('channel', channel);
  //console.log('user', user);
  //console.log('streak', streak);
  //console.log('msg', msg);
  //console.log('tags', tags);
  //console.log('methods', methods);
}

function onSubgiftHandler(channel, user, streak, recipient, methods, tags) {
  //console.log('------ SUBGIFT ------');
  //console.log('channel', channel);
  //console.log('user', user);
  //console.log('streak', streak);
  //console.log('recipient', recipient);
  //console.log('methods', methods);
  //console.log('tags', tags);
}

function onCheerHandler(channel, tags, msg) {
  //console.log('------ CHEER ------');
  //console.log('channel', channel);
  //console.log('tags', tags);
  //console.log('msg', msg);
}
