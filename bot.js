
const Discord = require('discord.js');
const client = new Discord.Client();

client.on('ready', () => {
  console.log("Bot is now running.");
});

var commands = {
  help: {
    info: "Shows all commands or the usage of a specific command.",
    arguments: [[false, "command name"]]
  }
};

client.on('message', async message => {
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
  }

  if (m !== "") {
    message.channel.send({embed: {
      color: 16777215,
      description: m
    }});
  }
});



// start bot
client.login(process.env.BOT_TOKEN);//BOT_TOKEN is the Client Secret
