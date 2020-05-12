
// Setup Discord:
const Discord = require("discord.js");
const client = new Discord.Client();

// Setup Firebase:
const firebase = require("firebase");
var firebaseConfig = {
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
var database = firebase.database();
var ref = {
  users: database.ref("users")
};

// Setup Request:
const request = require("request");
const fixieRequest = request.defaults({'proxy': process.env.FIXIE_URL});

client.on('ready', () => {
  console.log("Bot is now running.");
});

var commands = {
  help: {
    info: "Shows all commands or the usage of a specific command.",
    arguments: [[false, "command name"]]
  },
  connect: {
    info: "Connect your Discord account to your Clash of Clans account.",
    arguments: [["Player Tag"]]
  },
  disconnect: {
    info: "Disconnect your Discord account from your Clash of Clans account.",
    arguments: false
  }
};
var roles = {
  setup: false
};

client.on('message', async message => {
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
  var args = message.content.substring(1).split(' ');
  var cmd = args[0].toLowerCase();
  args = args.splice(1);

  var m = "";
  switch(cmd) {
    case "?":
    case "help":
      var help = "";
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
        ref.users.once("value", function(data) {
          var d = data.val();
          if (d[message.author.id]) {
            message.channel.send({embed: {
              color: 16777215,
              description: `You've already connected your account as ${d[message.author.id].saved.name}. To disconnect your account, use the "!disconnect" command.`
            }});
          } else {
            ref.users.child(message.author.id).set({
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
            }, function(err, res, body) {
              body = JSON.parse(body);
              console.log(body);
              console.log(res.statusCode);
              if (res.statusCode === 200) { // Successful
                if (body.name) { // Account exists
                  if (body.clan.tag === "#22P998QP0") { // In clan:
                    // Save the body response:
                    ref.users.child(message.author.id).child("saved").set(body);
                    // Set their username:
                    message.member.setNickname(body.name + "[" + body.townHallLevel + "]");
                    // Set their role:
                    switch(body.role) {
                      case "member":
                        message.member.roles.add(roles.member);
                      break;
                      case "admin": // elder
                        message.member.roles.add(roles.elder);
                      break;
                      case "coLeader":
                        message.member.roles.add(roles.coleader);
                      break;
                      case "leader":
                        message.member.roles.add(roles.leader);
                      break;
                    }
                    // Confirm connection:
                    message.channel.send({embed: {
                      color: 16777215,
                      description: `You are now connected as ${body.name}! If this is incorrect, please type "!disconnect".`
                    }});
                  } else { // NOT in clan:
                    ref.users.child(message.author.id).set(false);
                    message.channel.send({embed: {
                      color: 16777215,
                      description: `You must join the clan first!`
                    }});
                  }
                } else { // Account does not exist
                  ref.users.child(message.author.id).set(false);
                  message.channel.send({embed: {
                    color: 16777215,
                    description: `That user does not exist.`
                  }});
                }
              } else { // Unsuccessful
                ref.users.child(message.author.id).set(false);
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
      ref.users.child(message.author.id).set(false);
      m = "Account disconnected.";
    break;
    case "test":
      // message.member.roles.add(roles.leader);
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

// start bot
client.login(process.env.BOT_TOKEN); //BOT_TOKEN is the Client Secret
