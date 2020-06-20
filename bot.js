
// Setup Discord:
const Discord = require("discord.js");
const client = new Discord.Client({disableEveryone: false});

// Setup Firebase:
const firebase = require("firebase");
const firebaseConfig = {
  apiKey: "AIzaSyBgfiB26cap_PUCxwqIa8m0xPDqtrfXt5Q",
  authDomain: "ss-fluffy-bot.firebaseapp.com",
  databaseURL: "https://ss-fluffy-bot.firebaseio.com",
  projectId: "ss-fluffy-bot",
  storageBucket: "ss-fluffy-bot.appspot.com",
  messagingSenderId: "461874496304",
  appId: "1:461874496304:web:1375790da9e30654547ef5"
};
// Initialize Firebase
firebase.initializeApp(firebaseConfig);
let database = firebase.database();
let ref = {
  users: database.ref("users"),
  time: database.ref("time"),
  war: database.ref("war"),
  warNotifs: database.ref("warNotifs"),
  warHistory: database.ref("warHistory")
};

// Setup Request:
const request = require("request");
const fixieRequest = request.defaults({"proxy": process.env.FIXIE_URL});

client.on("ready", () => {
  console.log("Bot is now running.");
  client.channels.cache.get("723276193591459880").send({embed: {
    color: 16777215,
    description: "Bot reloaded."
  }});
});

const commands = {
  help: {
    info: "Shows all commands or the usage of a specific command.",
    arguments: [[false, "command name"]]
  },
  connect: {
    info: "Connect your Discord account to your Clash of Clans account.",
    arguments: [["player tag"]]
  },
  disconnect: {
    info: "Disconnect your Discord account from your Clash of Clans account.",
    arguments: false
  },
  wallet: {
    info: "Your own personal wallet! \"value\" gets the current amount of money in your wallet; \"give\" allows you to transfer money to another user; \"top\" returns the 10 richest users.",
    arguments: [[false, "value", "give", "top"]]
  }
};
let roles = {
  setup: false
};

client.on("message", async message => {
  // Setup roles:
  if (!roles.setup) {
    roles = {
      setup: true,
      member: message.guild.roles.cache.find(role => role.name === "Member"),
      elder: message.guild.roles.cache.find(role => role.name === "Elder"),
      coleader: message.guild.roles.cache.find(role => role.name === "Co-Leader"),
      leader: message.guild.roles.cache.find(role => role.name === "Leader")
    };
  }

  // If the message was from the bot, or the message did not start with "!":
  if (message.author.id === client.user.id || message.content.substring(0, 1) !== "!") {
    return;
  }

  // Get the command and arguments:
  let args = message.content.substring(1).split(' ');
  let cmd = args[0].toLowerCase();
  args = args.splice(1);

  let m = "";
  switch(cmd) {
    case "?":
    case "help":
      let help = "";
      if (!args[0]) { // If no command was specified:
        help = `**Help Menu**\n`;
        // Print all commands:
        for (var i in commands) {
          // += "__!help:__ Shows all commands or the usage of a specific command."
          help += `__!${i}:__\n${commands[i].info}\n\n`;
        }
        help += `_Pro tip: Use "!help <command>" for command usage_`;
      } else { // Command was specified:
        if (commands[args[0].toLowerCase()]) { // Commmand exists:
          help = `**!${args[0].toLowerCase()}:**\n`;
          help += `${commands[args[0].toLowerCase()].info}\n\n`;
          help += `**Usage:**\n`;
          help += `!${args[0].toLowerCase()} `;
          for (var arg = 0, arguments = commands[args[0].toLowerCase()].arguments; arg < arguments.length; arg++) {
            for (var opt = 0, options = arguments[arg]; opt < options.length; opt++) {
              help += options[opt] ? `<${options[opt]}>` : `(nothing)`;
              if (opt !== options.length - 1) {
                help += "/";
              }
            }
            if (arg !== arguments.length - 1) {
              help += " ";
            }
          }
        } else { // Command does not exist:
          help = "**Error:**\nThat command does not exist.";
        }
      }
      m = help;
    break;
    case "connect":
      if (args[0] && args[0].charAt(0) === "#") { // If player tag was specified
        var user = (args[1] && args[1].substring(0, 3) === "<@!" && args[1][args[1].length - 1] === ">" && message.member.roles.cache.find(role => role.name === "Leader")) ? args[1].substring(3, args[1].length - 1) : message.author.id;
        ref.users.once("value", function(data) {
          var d = data.val();
          if (d[user]) {
            message.channel.send({embed: {
              color: 16777215,
              description: `You've already connected your account as ${d[user].saved.name}. To disconnect your account, use the "!disconnect" command.`
            }});
          } else {
            ref.users.child(user).set({
              tag: args[0],
              currency: 100,
              saved: {
                waiting: true
              }
            });
            fixieRequest({
              headers: {
                Accept: "application/json",
                authorization: `Bearer ${process.env.API_TOKEN}`
              },
              uri: "https://api.clashofclans.com/v1/players/%23" + args[0].substring(1, args[0].length)
            }, async function(err, res, body) {
              body = JSON.parse(body);
              console.log(body);
              console.log(res.statusCode);
              if (res.statusCode === 200) { // Successful
                if (body.name) { // Account exists
                  if (body.clan.tag === "#PQG920LC") { // In clan:
                    // Save the body response:
                    ref.users.child(user).child("saved").set(body);
                    if (body.tag !== "#CULL88OG") { // Bot cannot change nickname/role of server owner
                      // Set their username:
                      var u = await message.guild.members.fetch(user);
                      u.setNickname(body.name + " [" + body.townHallLevel + "]");
                      // Set their role:
                      switch(body.role) {
                        case "member":
                          u.roles.add(roles.member);
                        break;
                        case "admin": // elder
                          u.roles.add(roles.elder);
                        break;
                        case "coLeader":
                          u.roles.add(roles.coleader);
                        break;
                        case "leader":
                          u.roles.add(roles.leader);
                        break;
                      }
                    }
                    // Confirm connection:
                    message.channel.send({embed: {
                      color: 16777215,
                      description: `${user === message.author.id ? "You are" : "<@!" + user + "> is"} now connected as ${body.name}! If this is incorrect, please type "!disconnect".`
                    }});
                  } else { // NOT in clan:
                    ref.users.child(user).set(false);
                    message.channel.send({embed: {
                      color: 16777215,
                      description: `You must join the clan first!`
                    }});
                  }
                } else { // Account does not exist
                  ref.users.child(user).set(false);
                  message.channel.send({embed: {
                    color: 16777215,
                    description: `That user does not exist.`
                  }});
                }
              } else { // Unsuccessful
                ref.users.child(user).set(false);
                message.channel.send({embed: {
                  color: 16777215,
                  description: `There was an error: ${body}`
                }});
              }
            });
            m = "Connecting you to your Clash of Clans account...";
          }
        });
      } else if (args[0] && args[0].charAt(0) !== "#") {
        m = `Your player tag must start with a "#". The command should look something like this:\n!connect #CULL88OG`
      } else {
        m = `You must include your player tag. The command should look something like this:\n!connect #CULL88OG`;
      }
    break;
    case "disconnect":
      var user = (args[0] && args[0].substring(0, 3) === "<@!" && args[0][args[0].length - 1] === ">" && message.member.roles.cache.find(role => role.name === "Leader")) ? args[0].substring(3, args[0].length - 1) : message.author.id;
      ref.users.child(user).set(false);
      if (user !== 268131125279457280) { // Bot cannot change nickname/role of server owner
        // Remove all roles and nickname:
        var u = await message.guild.members.fetch(user);
        u.roles.set([]);
        u.setNickname("");
      }
      m = "Account disconnected.";
    break;
    case "delete":
      if (message.member.roles.cache.find(role => role.name === "Leader")) {
        if (args[0] === undefined) {
          args[0] = "1";
        }
        var deleteCount = parseInt(args[0], 10) + 1;
        if (deleteCount > 1 && deleteCount <= 51) {
          // Get the messages
          var fetched = await message.channel.messages.fetch({
            limit: deleteCount
          });
          // Delete the messages
          await message.channel.bulkDelete(fetched);
        } else {
          m = "The number of items to delete must be between 1 and 50.";
        }
      } else {
        m = "You can't do that!";
      }
    break;
    case "wallet":
      switch(args[0]) {
        case "top":
          ref.users.once("value", function(data) {
            var d = data.val();
            var money = [];
            for (var i in d) {
              if (d[i]) {
                money.push({
                  user: d[i].saved.name,
                  money: d[i].currency
                });
              }
            }
            quicksort(money, 0, money.length - 1, "money");
            var topList = "**Wallet Leaderboard**\n";
            for (var i = 0; i < Math.min(money.length, 10); i++) {
              topList += `${(i + 1)}. ${money[i].user}: *$${money[i].money}*\n`;
            }
            message.channel.send({embed: {
              color: 16777215,
              description: topList
            }});
          });
        break;
        case "give":
        case "send":
          var other = args[1].substring(3, args[1].length - 1);
          var cash = Math.round(Number(args[2]) * 100) / 100;
          if (args[1] && args[1].substring(0, 3) === "<@!" && args[1][args[1].length - 1] === ">" && args[2] && cash > 0 && message.author.id !== other) { // Checks the arguments to make sure they're valid
            ref.users.once("value", function(data) {
              var d = data.val();
              if (d[message.author.id] && d[other]) { // Both have an account
                if (d[message.author.id].currency >= cash) { // Has enough funds
                  // Send message first
                  message.channel.send({embed: {
                    color: 16777215,
                    description: `<@!${message.author.id}> gave $${cash} to <@!${other}>.\n<@!${message.author.id}> now has $${Math.round((d[message.author.id].currency - cash) * 100) / 100}.\n<@!${other}> now has $${Math.round((d[other].currency + cash) * 100) / 100}.\n`
                  }});
                  // Subtract from their funds:
                  ref.users.child(message.author.id).child("currency").set(Math.round((d[message.author.id].currency - cash) * 100) / 100);
                  // Add to other person's funds:
                  ref.users.child(other).child("currency").set(Math.round((d[other].currency + cash) * 100) / 100);
                } else { // Not enough funds
                  message.channel.send({embed: {
                    color: 16777215,
                    description: `You don't have enough money! You currently have $${d[message.author.id].currency}.`
                  }});
                }
              } else if (d[other]) { // They do not have an account
                message.channel.send({embed: {
                  color: 16777215,
                  description: `You don't have an account! Use "!connect <player tag>" to make one.`
                }});
              } else { // Other person does not have an account
                message.channel.send({embed: {
                  color: 16777215,
                  description: `The person you are trying to give money to doesn't have an account! Tell them to use "!connect <player tag>" to make one.`
                }});
              }
            });
          } else { // One or more arguments are not valid
            m = "You need to specify how much to transfer and to whom. The command should look something like this:\n!wallet give @simplexshotz 100";
          }
        break;
        case "value":
        default: // Get currency:
          ref.users.once("value", function(data) {
            var d = data.val();
            if (d[message.author.id]) {
              message.channel.send({embed: {
                color: 16777215,
                description: `You currently have $${d[message.author.id].currency}.`
              }});
            } else {
              message.channel.send({embed: {
                color: 16777215,
                description: `You don't have an account! Use "!connect <player tag>" to make one.`
              }});
            }
          });
        break;
      }
    break;
    case "test":
      // message.member.roles.add(roles.leader);
      console.log(args);
      m = "Test complete.";
    break;
    default:
      m = `That command does not exist! Use "!help" for help.`;
    break;
  }

  if (m !== "") {
    message.channel.send({embed: {
      color: 16777215,
      description: m
    }});
  }
});

function updateClan() {
  fixieRequest({
    headers: {
      Accept: "application/json",
      authorization: `Bearer ${process.env.API_TOKEN}`
    },
    uri: "https://api.clashofclans.com/v1/players/%23" + args[0].substring(1, args[0].length)
  }, function(err, res, body) {

  });
}

function partition(arr, lo, hi, by) {
  var pivot = (by ? arr[hi][by] : arr[hi]);
  var i = lo;
  for (var j = lo; j < hi; j++) {
    if ((by ? arr[j][by] : arr[j]) > pivot) {
      if (i !== j) {
        var t = arr[j];
        arr[j] = arr[i];
        arr[i] = t;
      }
      i++;
    }
  }
  var t = arr[hi];
  arr[hi] = arr[i];
  arr[i] = t;
  return i;
}
function quicksort(arr, lo, hi, by) {
  if (lo < hi) {
    var p = partition(arr, lo, hi, by);
    quicksort(arr, lo, p - 1, by);
    quicksort(arr, p + 1, hi, by);
  }
}

function convertToValidDate(cocDate) {
  var year = cocDate.substring(0, 4);
  var month = cocDate.substring(4, 6);
  var day = cocDate.substring(6, 8);

  var hour = cocDate.substring(9, 11);
  var minute = cocDate.substring(11, 13);
  var second = cocDate.substring(13, 15);

  return `${year}-${month}-${day}T${hour}:${minute}:${second}.000Z`;
}

function updateWar() {
  fixieRequest({
    headers: {
      Accept: "application/json",
      authorization: `Bearer ${process.env.API_TOKEN}`
    },
    uri: "https://api.clashofclans.com/v1/clans/%23PQG920LC/currentwar"
  }, async function(err, res, body) {
    body = JSON.parse(body);
    if (res.statusCode === 200) { // Successful
      ref.war.set(body);
    }
  }); // end request
}

setInterval(function() {
  ref.time.once("value", function(data) {
    var time = data.val();
    if (time % (1440 * 3 / 4) === 0) { // every 3/4ths of a day
      ref.war.once("value", function(data) {
        var warData = data.val();
        if (warData === null || warData.state === "notInWar") {
          updateWar();
        }
      }); // end war database reference
    }
    if (time % 1440 === 0) { // every whole day
      // TODO: update clan status
    }
    ref.time.set(time + 1);
  }); // end time database reference
  ref.war.once("value", function(data) {
    let warData = data.val();
    if (warData !== null) { // War data exists
      ref.warNotifs.once("value", function(data) {
        let warNotifs = data.val();
        switch (warData.state) {
          case "notInWar":
            let newWarNotifs = {
              "0_preparationAboutToEnd": false,
              "1_warBegin": false,
              "2-R_attackReminderReload": false,
              "2_attackReminder": false,
              "3-R_warAboutToEndReload": false,
              "3_warAboutToEnd": false,
              "4-R_warEndReload": false,
              "4_warEnd": false
            };
            ref.warNotifs.set(newWarNotifs);
          break;
          case "preparation":
            var preparationEndTime = new Date(convertToValidDate(warData.startTime)).getTime();
            var curTime = new Date().getTime();
            if (!warNotifs["0_preparationAboutToEnd"] && curTime >= (preparationEndTime - (2 * 60 * 60 * 1000))) { // Preparation is about to end (in 2 hours)
              client.channels.cache.get("709784763858288681").send({embed: {
                color: 16777215,
                description: "@everyone\n\nWar Preparation is going to end in less than 2 hours! Make sure to donate!"
              }});
              ref.warNotifs.child("0_preparationAboutToEnd").set(true);
            }
            if (!warNotifs["1_warBegin"] && curTime >= preparationEndTime) { // Preparation has ended
              client.channels.cache.get("709784763858288681").send({embed: {
                color: 16777215,
                description: "@everyone\n\nWar Preparation has ended! It's war time! Go get your attacks in!"
              }});
              ref.war.child("state").set("inWar");
              ref.warNotifs.child("1_warBegin").set(true);
            }
          break;
          case "inWar":
            var warEndTime = new Date(convertToValidDate(warData.endTime)).getTime();
            var curTime = new Date().getTime();
            if (!warNotifs["2-R_attackReminderReload"] && curTime >= (warEndTime - (2 * 60 * 60 * 1000 + 60 * 1000))) { // Reload war status 1 min before next reminder
              updateWar();
              ref.warNotifs.child("2-R_attackReminderReload").set(true);
            }
            if (!warNotifs["2_attackReminder"] && curTime >= (warEndTime - (2 * 60 * 60 * 1000))) { // Send war reminders 2 hours before war ends
              ref.users.once("value", function(data) {
                // GET USERS THAT STILL HAVE TO ATTACK:
                let userData = data.val();
                let tagToID = {};
                for (let i in userData) {
                  if (userData[i]) {
                    tagToID[userData[i].tag] = i;
                  }
                }
                let hasToAttack = [];
                for (let i = 0, members = warData.clan.members, len = members.length; i < len; i++) {
                  if (members[i].attacks.length < 2 && tagToID[members[i].tag]) { // If they have less than 2 attacks and they are in the Discord server
                    hasToAttack.push(tagToID[members[i].tag]);
                  }
                }
                if (hasToAttack.length !== 0) { // Attacks are left
                  let pingText = "<@!" + hasToAttack.join("><@!") + ">";
                  // Send message:
                  client.channels.cache.get("709784763858288681").send({embed: {
                    color: 16777215,
                    description: pingText + "\n\nWAR ENDS IN LESS THAN 2 HOURS! GET YOUR ATTACKS IN!"
                  }});
                } else { // Everyone has attacked!!! WOW!
                  client.channels.cache.get("709784763858288681").send({embed: {
                    color: 16777215,
                    description: "War ends in less than 2 hours! Everyone in the server has gotten their attacks in; nice job!"
                  }});
                }
              });
              ref.warNotifs.child("2_attackReminder").set(true);
            }
            if (!warNotifs["3-R_warAboutToEndReload"] && curTime >= (warEndTime - (30 * 60 * 1000 + 60 * 1000))) { // Reload war status 1 min before next reminder
              updateWar();
              ref.warNotifs.child("3-R_warAboutToEndReload").set(true);
            }
            if (!warNotifs["3_warAboutToEnd"] && curTime >= (warEndTime - (30 * 60 * 1000))) { // War is about to end (in 30 minutes)
              ref.users.once("value", function(data) {
                // GET USERS THAT STILL HAVE TO ATTACK:
                let userData = data.val();
                let tagToID = {};
                for (let i in userData) {
                  if (userData[i]) {
                    tagToID[userData[i].tag] = i;
                  }
                }
                let hasToAttack = [];
                for (let i = 0, members = warData.clan.members, len = members.length; i < len; i++) {
                  if (members[i].attacks.length < 2 && tagToID[members[i].tag]) { // If they have less than 2 attacks and they are in the Discord server
                    hasToAttack.push(tagToID[members[i].tag]);
                  }
                }
                if (hasToAttack.length !== 0) { // Attacks are left
                  let pingText = "<@!" + hasToAttack.join("><@!") + ">";
                  // Send message:
                  client.channels.cache.get("709784763858288681").send({embed: {
                    color: 16777215,
                    description: pingText + "\n\nWAR ENDS IN LESS THAN 30 MINUTES! GET YOUR ATTACKS IN!"
                  }});
                } else { // Everyone has attacked!!! WOW!
                  client.channels.cache.get("709784763858288681").send({embed: {
                    color: 16777215,
                    description: "War ends in less than 30 minutes! Everyone in the server has gotten their attacks in; nice job!"
                  }});
                }
              });
              ref.warNotifs.child("3_warAboutToEnd").set(true);
            }
            if (!warNotifs["4-R_warEndReload"] && curTime >= warEndTime + (1 * 60 * 1000)) { // Reload war status 1 min before next reminder
              updateWar();
              ref.warNotifs.child("4-R_warEndReload").set(true);
            }
            if (!warNotifs["4_warEnd"] && curTime >= warEndTime + (2 * 60 * 1000)) { // 2 mins after war has ended
              console.log(warData);
              client.channels.cache.get("709784763858288681").send({embed: {
                color: 16777215,
                description: "@everyone\n\nWar has ended! [in the future, stats about the war will be seen here]"
              }});
              // TODO: send war info, such as stars + who won + best attacker, etc.
              ref.warHistory.push(warData);
              ref.war.child("state").set("notInWar");
              ref.warNotifs.child("4_warEnd").set(true);
            }
          break;
        }
      });
    }
  }); // end war database reference
}, 60 * 1000); // end setInterval

// start bot
client.login(process.env.BOT_TOKEN); //BOT_TOKEN is the Client Secret
