
// Setup Discord:
const Discord = require("discord.js");
const client = new Discord.Client({disableEveryone: false});

// Setup Firebase:
const firebase = require("firebase");
// const admin = require('firebase-admin');
const firebaseConfig = {
  apiKey: "AIzaSyBgfiB26cap_PUCxwqIa8m0xPDqtrfXt5Q",
  authDomain: "ss-fluffy-bot.firebaseapp.com",
  databaseURL: "https://ss-fluffy-bot.firebaseio.com",
  projectId: "ss-fluffy-bot",
  storageBucket: "ss-fluffy-bot.appspot.com",
  messagingSenderId: "461874496304",
  appId: "1:461874496304:web:1375790da9e30654547ef5"
};
// let database = admin.database();
// const serviceAccount = require("key.json");
// Initialize Firebase
// admin.initializeApp({
//   credential: admin.credential.cert(serviceAccount),
//   databaseURL: "https://ss-fluffy-bot.firebaseio.com"
// });
firebase.initializeApp(firebaseConfig);
let database = firebase.database();
let ref = {
  users: database.ref("users"),
  time: database.ref("time"),
  war: database.ref("war"),
  warNotifs: database.ref("warNotifs"),
  warHistory: database.ref("warHistory"),
  ping: database.ref("ping")
};
// console.log(database);
// console.log(admin.credential.applicationDefault());
// ref.users.once("value", function(data) {
//   let d = data.val();
//   console.log(d);
// });

// Setup Request:
const request = require("request");
const fixieRequest = request.defaults({"proxy": process.env.FIXIE_URL});

client.on("ready", () => {
  console.log("Bot is now running.");
  client.channels.cache.get("723276193591459880").send({embed: {
    color: 16777215,
    description: "Bot reloaded."
  }});
  ///
  ref.ping.set("pong!").then(()=>{console.log("good!");}).catch((e)=>{console.log(e);});
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
        var user = (args[1] && args[1].substring(0, 3) === "<@!" && args[1][args[1].length - 1] === ">" && message.member.roles.cache.find(role => role.name === "Leader")) ? (args[1].substring(3, args[1].length - 1)) : ((args[1] && args[1].substring(0, 2) === "<@" && args[1][args[1].length - 1] === ">" && message.member.roles.cache.find(role => role.name === "Leader")) ? (args[1].substring(2, args[1].length - 1)) : (message.author.id));
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
    case "war":
      switch(args[0]) {
        case "history":
          ref.warHistory.once("value", function(data) {
            let warHData = data.val();
            if (args[1]) {
              let n = 0;
              let warKey = false;
              for (let i in warHData) {
                n++;
                if (n === Number(args[1])) {
                  warKey = i;
                  break;
                }
              }
              if (warKey) {
                let warData = warHData[warKey];
                m = getWarResults(warData, false, n).message;
              } else {
                m = "Please enter a valid war number.";
              }
            } else {
              m = "**War History:**";
              let n = 1;
              for (let i in warHData) {
                m += `\n**War ${n}:** ${warHData[i].clan.name} _vs._ ${warHData[i].opponent.name} | ${warHData[i].clan.stars} — ${warHData[i].opponent.stars} (${((warHData[i].clan.stars > warHData[i].opponent.stars) || (warHData[i].clan.stars === warHData[i].opponent.stars && warHData[i].clan.destructionPercentage > warHData[i].opponent.destructionPercentage)) ? ("Won") : ((warHData[i].clan.stars === warHData[i].opponent.stars && warHData[i].clan.destructionPercentage === warHData[i].opponent.destructionPercentage) ? "Drawn" : "Lost")})`;
                n++;
              }
              m += "\n\nUse _!war history <war number>_ to get more details about a specific war.";
            }
            message.channel.send({embed: {
              color: 16777215,
              description: m
            }});
          });
        break;
        case "best":
          // Get the war history data:
          ref.warHistory.once("value", function(data) {
            let warHData = data.val();

            // Determine how many of the most recent wars to average:
            let totalWars = 0;
            for (let i in warHData) {
              totalWars++;
            }
            let numberOfWarsToAverage = totalWars;
            if (Number(args[1]) && Number(args[1]) > 0) {
              numberOfWarsToAverage = Math.min(Number(args[1]), totalWars);
            }

            // Get the results for those wars:
            let allWarResults = getAllWarResults(warHData, numberOfWarsToAverage);

            // Normalize all of the war results, based on how many wars each player was in:
            let allWarResultsNormalized = [];
            for (let i = 0; i < allWarResults.length; i++) {
              allWarResultsNormalized.push({
                tag: allWarResults[i].tag,
                name: allWarResults[i].name,
                score: allWarResults[i].score / allWarResults[i].wars,
                stars: allWarResults[i].stars / allWarResults[i].wars,
                percentage: allWarResults[i].percentage / allWarResults[i].wars,
                attackDifference: allWarResults[i].attackDifference / allWarResults[i].wars
              });
            }

            // Sort the results based on score:
            quicksort(allWarResultsNormalized, 0, allWarResultsNormalized.length - 1, "score");

            // Format the results:
            let m = `__**Average War Ratings (Past ${numberOfWarsToAverage} War${numberOfWarsToAverage !== 1 ? "s" : ""}):**__`;
            for (let i = 0; i < allWarResultsNormalized.length; i++) {
              m += `\n__${i + 1}. ${allWarResultsNormalized[i].name}:__\n${Math.round(allWarResultsNormalized[i].stars * 100) / 100} Stars, ${Math.round(allWarResultsNormalized[i].percentage * 100) / 100}%, Attacked ${Math.round(Math.abs(allWarResultsNormalized[i].attackDifference) * 100) / 100} Place${Math.abs(allWarResultsNormalized[i].attackDifference) !== 1 ? "s" : ""} ${Math.abs(allWarResultsNormalized[i].attackDifference) === allWarResultsNormalized[i].attackDifference ? "Higher" : "Lower"}`;
            }

            // Send the results as a message:
            sendEmbeds(m, message.channel); // TODO: CHECK IF THEY ARE STILL EVEN IN THE CLAN!!
          });
        break;
      }
    break;
    case "test":
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

function updateWar(callback) {
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
      if (callback) {
        callback();
      }
    }
  }); // end request
}

function getDefenderMapPosition(wd, tag) {
  for (let i = 0; i < wd.opponent.members.length; i++) {
    if (wd.opponent.members[i].tag === tag) {
      return wd.opponent.members[i].mapPosition;
    }
  }
}

function getAllWarResults(warHData, numberOfWarsToAverage) {
  // Find the total number of wars:
  let totalWars = 0;
  for (let i in warHData) {
    totalWars++;
  }

  // Get all war results:
  let allWarResults = {};
  let n = 0;
  for (let i in warHData) {
    if (n >= totalWars - numberOfWarsToAverage) {
      let warResults = getWarResults(warHData[i]).attackScores;
      for (let j = 0; j < warResults.length; j++) {
        if (!allWarResults[warResults[j].tag]) {
          allWarResults[warResults[j].tag] = {
            tag: warResults[j].tag,
            name: warResults[j].name,
            score: 0,
            stars: 0,
            percentage: 0,
            attackDifference: 0,
            wars: 0
          };
        }
        allWarResults[warResults[j].tag].score += warResults[j].score;
        allWarResults[warResults[j].tag].stars += warResults[j].stars;
        allWarResults[warResults[j].tag].percentage += warResults[j].percentage;
        allWarResults[warResults[j].tag].attackDifference += warResults[j].attackDifference;
        allWarResults[warResults[j].tag].wars++;
      }
    }
    n++;
  }

  // Sort all war results by score:

  // Start by transferring the data into an array:
  let allWarResultsFinal = [];
  for (let i in allWarResults) {
    allWarResultsFinal.push(allWarResults[i]);
  }

  // Then sort it:
  quicksort(allWarResultsFinal, 0, allWarResultsFinal.length - 1, "score");

  // Return the sorted, finalized results:
  return allWarResultsFinal;
}

function getWarResults(warData, isAnnouncement, n) {
  // Get the total clan percent; used for the average
  let clanPercent = 0;
  for (let i = 0; i < warData.clan.members.length; i++) {
    if (warData.clan.members[i].attacks) {
      for (let j = 0; j < warData.clan.members[i].attacks.length; j++) {
        clanPercent += warData.clan.members[i].attacks[j].destructionPercentage;
      }
    }
  }

  // Get the total opponent percent; used for the average
  let opponentPercent = 0;
  for (let i = 0; i < warData.opponent.members.length; i++) {
    if (warData.opponent.members[i].attacks) {
      for (let j = 0; j < warData.opponent.members[i].attacks.length; j++) {
        opponentPercent += warData.opponent.members[i].attacks[j].destructionPercentage;
      }
    }
  }

  // Create and populate the attack scores:
  let attackScores = [];
  for (let i = 0; i < warData.clan.members.length; i++) {
    attackScores.push({
      tag: warData.clan.members[i].tag,
      name: warData.clan.members[i].name,
      score: 0,
      stars: 0,
      percentage: 0,
      attackDifference: 0,
      attacks: 0
    });
    if (warData.clan.members[i].attacks) {
      for (let j = 0; j < warData.clan.members[i].attacks.length; j++) {
        let attack = warData.clan.members[i].attacks[j]; // 10 is max              up to here v    Account for placement difference                                                             v reduce impact
        attackScores[i].score += (attack.stars + 1) * (attack.destructionPercentage / 100) * (10 / 8) + (warData.clan.members[i].mapPosition - getDefenderMapPosition(warData, attack.defenderTag)) / (warData.teamSize / 2);
        attackScores[i].stars += attack.stars;
        attackScores[i].percentage += attack.destructionPercentage;
        attackScores[i].attackDifference += warData.clan.members[i].mapPosition - getDefenderMapPosition(warData, attack.defenderTag);
        attackScores[i].attacks++;
      }
    }
  }

  // Sort the attack scores by score:
  quicksort(attackScores, 0, attackScores.length - 1, "score");

  // Get the top attacks text:
  let topAttacks = "";
  for (let i = 0; i < 10; i++) {
    topAttacks += `\n__${(i + 1)}. ${attackScores[i].name}:__\n${attackScores[i].stars} Stars, ${attackScores[i].percentage}%, Attacked ${Math.abs(attackScores[i].attackDifference)} Place${Math.abs(attackScores[i].attackDifference) !== 1 ? "s" : ""} ${Math.abs(attackScores[i].attackDifference) === attackScores[i].attackDifference ? "Higher" : "Lower"}`;
  }

  // Return the message and sorted attack scores:
  return {
    message: `__**` + (isAnnouncement ? ("") : (`War ${n}: `)) + `${warData.clan.name} vs. ${warData.opponent.name}**__\n**Final Result:** ${warData.clan.stars} — ${warData.opponent.stars} (War ${((warData.clan.stars > warData.opponent.stars) || (warData.clan.stars === warData.opponent.stars && warData.clan.destructionPercentage > warData.opponent.destructionPercentage)) ? ("Won") : ((warData.clan.stars === warData.opponent.stars && warData.clan.destructionPercentage === warData.opponent.destructionPercentage) ? "Drawn" : "Lost")})\n**Destruction Percentage:** ${Math.round(warData.clan.destructionPercentage * 100) / 100}% — ${Math.round(warData.opponent.destructionPercentage * 100) / 100}%\n**Attacks:** ${warData.clan.attacks}/${warData.teamSize * 2} — ${warData.opponent.attacks}/${warData.teamSize * 2}\n\n**Average Stars:** ${Math.round(warData.clan.stars / warData.clan.attacks * 100) / 100} — ${Math.round(warData.opponent.stars / warData.opponent.attacks * 100) / 100}\n**Average Percent:** ${Math.round(clanPercent / warData.clan.attacks * 100) / 100}% — ${Math.round(opponentPercent / warData.opponent.attacks * 100) / 100}%\n\n**Top Attackers:**${topAttacks}`,
    attackScores: attackScores
  };
}

function getTagToIDObject(userData) {
  // Get the user ID of each player and map them to their tag:
  let tagToID = {};
  for (let i in userData) {
    if (userData[i]) {
      tagToID[userData[i].tag] = i;
    }
  }
  return tagToID;
}

function getAttacksLeft(warData, userData) {
  // Get the user ID of each player and map them to their tag:
  let tagToID = getTagToIDObject(userData);
  // Get all the users that have to attack:
  let hasToAttack = [];
  for (let i = 0, members = warData.clan.members, len = members.length; i < len; i++) {
    if ((!members[i].attacks || members[i].attacks.length < 2) && tagToID[members[i].tag]) { // If they have less than 2 attacks and they are in the Discord server
      hasToAttack.push(tagToID[members[i].tag]);
    }
  }
  // Return the array:
  return hasToAttack;
}

async function sendEmbeds(m, channel) {
  let i = 0;
  while (i < m.length) {
    // Find the end of this bit:
    let end = i;
    if (i + 2000 <= m.length) {
      for (let j = i + 2000; j > i; j--) {
        if (m[j] === "\n") {
          end = j;
          break;
        }
      }
    } else {
      end = m.length;
    }
    let chunk = m.substring(i, end);
    await channel.send({embed: {
      color: 16777215,
      description: chunk
    }}); // Wait for the embed to be sent
    i = end;
  }
}

setInterval(function() {
  ref.time.once("value", function(data) {
    var time = data.val();
    if (time % (1440 * 3 / 4) === 0) { // every 3/4ths of a day
      ref.war.once("value", function(data) {
        var warData = data.val();
        if (warData === null || warData.state === "notInWar" || warData.state === "warEnded") {
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
            // do nothing
          break;
          case "preparation":
            var preparationEndTime = new Date(convertToValidDate(warData.startTime)).getTime();
            var curTime = new Date().getTime();
            if (!warNotifs["0_preparationAboutToEnd"] && curTime >= (preparationEndTime - (2 * 60 * 60 * 1000))) { // Preparation is about to end (in 2 hours)
              client.channels.cache.get("709784763858288681").send({embed: {
                color: 16777215,
                description: "@everyone\n\nWar Preparation is going to end in less than 2 hours! Make sure to donate!"
              }});
              let newWarNotifs = {
                "0_preparationAboutToEnd": true,
                "1_warBegin": false,
                "2-R_attackReminderReload": false,
                "2_attackReminder": false,
                "3-R_warAboutToEndReload": false,
                "3_warAboutToEnd": false,
                "4-R_warEndReload": false,
                "4_warEnd": false
              };
              ref.warNotifs.set(newWarNotifs);
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
                let userData = data.val();
                // Get users that still have to attack:
                const hasToAttack = getAttacksLeft(warData, userData);

                if (hasToAttack.length !== 0) { // Attacks are left
                  let pingText = "<@!" + hasToAttack.join("><@!") + ">";
                  // Send message:
                  client.channels.cache.get("709784763858288681").send({embed: {
                    color: 16777215,
                    description: pingText + "\n\nWAR ENDS IN LESS THAN 2 HOURS! GET YOUR ATTACKS IN!"
                  }});
                } else { // Everyone has attacked!
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
                let userData = data.val();
                // Get users that still have to attack:
                const hasToAttack = getAttacksLeft(warData, userData);

                if (hasToAttack.length !== 0) { // Attacks are left
                  let pingText = "<@!" + hasToAttack.join("><@!") + ">";
                  // Send message:
                  client.channels.cache.get("709784763858288681").send({embed: {
                    color: 16777215,
                    description: pingText + "\n\nWAR ENDS IN LESS THAN 30 MINUTES! GET YOUR ATTACKS IN!"
                  }});
                } else { // Everyone has attacked!
                  client.channels.cache.get("709784763858288681").send({embed: {
                    color: 16777215,
                    description: "War ends in less than 30 minutes! Everyone in the server has gotten their attacks in; nice job!"
                  }});
                }
              });
              ref.warNotifs.child("3_warAboutToEnd").set(true);
            }
            if (!warNotifs["4-R_warEndReload"] && curTime >= warEndTime + (3 * 60 * 1000)) { // Reload war status 1 min before next reminder
              updateWar(function() {
                ref.war.child("state").set("warEnded");
              });
              ref.warNotifs.child("4-R_warEndReload").set(true);
            }
          break;
          case "warEnded":
            if (!warData.endTime) {
              // Update notification status:
              let newWarNotifs = {
                "0_preparationAboutToEnd": false,
                "1_warBegin": false,
                "2-R_attackReminderReload": true,
                "2_attackReminder": true,
                "3-R_warAboutToEndReload": true,
                "3_warAboutToEnd": true,
                "4-R_warEndReload": true,
                "4_warEnd": true
              };
              ref.warNotifs.set(newWarNotifs);
            } else {
              var warEndTime = new Date(convertToValidDate(warData.endTime)).getTime();
              var curTime = new Date().getTime();
              if (!warNotifs["4_warEnd"] && curTime >= warEndTime + (3.1 * 60 * 1000)) { // War has ended
                // Get the results of the war in text format:
                const warResults = getWarResults(warData, true);

                // Send the announcement:
                client.channels.cache.get("709784763858288681").send({embed: {
                  color: 16777215,
                  description: `@everyone\n\nWar has ended!\n\n${warResults.message}`
                }});
                // Save the war to war history:
                ref.warHistory.push(warData);
                // Update notification status:
                let newWarNotifs = {
                  "0_preparationAboutToEnd": false,
                  "1_warBegin": false,
                  "2-R_attackReminderReload": true,
                  "2_attackReminder": true,
                  "3-R_warAboutToEndReload": true,
                  "3_warAboutToEnd": true,
                  "4-R_warEndReload": true,
                  "4_warEnd": true
                };
                ref.warNotifs.set(newWarNotifs);
                // Give people their moolah based on their attack position:
                ref.users.once("value", function(data) {
                  let userData = data.val();

                  let tagToID = getTagToIDObject(userData);
                  for (let i = 0; i < warResults.attackScores.length; i++) {
                    if (tagToID[warResults.attackScores[i].tag]) { // Check if they have a discord account connected
                      if (warResults.attackScores[i].score > 0) { // Score was > 0
                        ref.users.child(tagToID[warResults.attackScores[i].tag]).child("currency").set(userData[tagToID[warResults.attackScores[i].tag]].currency + Math.round(warResults.attackScores[i].score * 10));
                        client.users.cache.get(tagToID[warResults.attackScores[i].tag]).send({embed: {
                          color: 16777215,
                          description: `You recieved $${Math.round(warResults.attackScores[i].score * 10)} for your war attacks! You placed #${i + 1} compared to other attackers!`
                        }});
                      }
                      if (warResults.attackScores[i].attacks === 0) { // Player did not attack
                        client.users.cache.get(tagToID[warResults.attackScores[i].tag]).send({embed: {
                          color: 16777215,
                          description: `You forgot to attack in war! Please opt out if you will be unable to attack in the next war.`
                        }});
                      }
                    }
                  }
                });
              }
            }
          break;
        }
      });
    }
  }); // end war database reference
}, 60 * 1000); // end setInterval

// start bot
client.login(process.env.BOT_TOKEN); //BOT_TOKEN is the Client Secret
