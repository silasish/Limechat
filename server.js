const WebSocket = require('ws');
const server = new WebSocket.Server({
  port: process.env.PORT
});

class User {
    constructor(name, socket, color) {
        this.name = name;
        this.socket = socket;
        this.color = color
    }
}

class Command {
    constructor(name, args, handler) {
        this.name = name;
        this.args = args;
        this.handler = handler;
    }
}

let loggedInSockets = [];
let commands = [];
const socketToUser = new Map();
const deathMessages = [
    "%v% was shot by %a%",
    "%v% was pummeled by %a%",
    "%v% was pricked to death whilst trying to escape %a%",
    "%v% drowned whilst trying to escape %a%",
    "%v% experienced kinetic energy whilst trying to escape %a%",
    "%v% was blown up by %a%",
    "%v% noclipped into the backrooms after %a% pushed them into a glitchy chair",
    "%v% was squashed by a falling anvil whilst fighting %a%",
    "%v% was slain by %a%",
    "%v% had 537 compiler errors in their code after %a% commited straight to prod."
]

function getUserByName(username) {
    let userR = false
    loggedInSockets.forEach((s) => {
        let user = socketToUser.get(s)
        if (user) {
            if (user.name == username) {
                userR = user
            }
        }
    })
    return userR
}

function sendGlobalMessage(name, content, color) {
    loggedInSockets.forEach((s) => s.send(JSON.stringify({
        type: "message",
        name: name,
        content: content,
        color: color
    })));
}

function sendPrivateMessage(socket, name, content, color) {
    socket.send(JSON.stringify({
        type: "message",
        name: name,
        content: content,
        color: color
    }));
}

function sendError(socket, error) {
    socket.send(JSON.stringify({
        type: "error",
        error: error
    }))
}

function generateArgs(raw, args) {
  var parts = raw.split(" ");
  var tail = parts.slice(args-1).join(" ");
  var result = parts.slice(0,args-1);
  result.push(tail);
  return result;
}

function handleMessage(socket, message) {
    if (message.content[0] == "/") {
        // command
        commands.forEach((command) => {
            let args = generateArgs(message.content, command.args)
          
            if ("/" + command.name == args[0]) {
                if (args.length == command.args) {
                    let cmdReturn = command.handler(socket, args)
                    sendPrivateMessage(socket, "Server > You", cmdReturn, "white")
                } else {
                    sendPrivateMessage(socket, "Server > You", "Incorrect number of arguments.", "#fc3737")
                }
            }
        });
    } else {
        // regular message
        sendGlobalMessage(socketToUser.get(socket).name, message.content, socketToUser.get(socket).color)
    }
}

commands.push(new Command("help", 1, function(socket, args) {
    let returnVal = "Commands: "
    commands.forEach(c => {
        returnVal += c.name + ", "
    })

    returnVal = returnVal.slice(0, -2); 
    return returnVal
}));

commands.push(new Command("list", 1, function(socket, args) {
    let returnVal = "Online: "
    loggedInSockets.forEach(s => {
        returnVal += socketToUser.get(s).name + ", "
    })

    returnVal = returnVal.slice(0, -2); 
    return returnVal
}));

commands.push(new Command("whatsnew", 1, function(socket, args) {
    return "Bugfixes and send online users on login. Basically fancy behind-the-scenes stuff."
}));

commands.push(new Command("eval", 2, function(socket, args) {
    if (socketToUser.get(socket).name == "Silas") {
      return "Eval: " + eval(args[1])
    } else {
      return "No permission. Stop." 
    }
}));

commands.push(new Command("msg", 3, function(socket, args) {
    let user = getUserByName(args[1])
    if (user) {
        sendPrivateMessage(user.socket, socketToUser.get(socket).name + " > You", args[2], "white")
        return "Sent message to " + user.name
    } else {
        return "User wasn't found."
    }
}));

commands.push(new Command("kill", 2, function(socket, args) {
    let user = getUserByName(args[1])
    if (user) {
        sendGlobalMessage("Server", deathMessages[Math.floor(Math.random() * deathMessages.length)].replace("%v%", user.name).replace("%a%", socketToUser.get(socket).name), "white")
        return "Killed " + user.name
    } else {
        return "User wasn't found."
    }
}));

commands.push(new Command("cat", 1, function(socket, args) {
    sendGlobalMessage(socketToUser.get(socket).name, "ฅ(ﾐ⚈ ﻌ ⚈ﾐ)ฅ", socketToUser.get(socket).color)
    return "Sent cat!"
}));

commands.push(new Command("uwu", 1, function(socket, args) {
    sendGlobalMessage(socketToUser.get(socket).name, "UwU", socketToUser.get(socket).color + ";font-size: 5vw;")
    return "UwU"
}));


commands.push(new Command("color", 2, function(socket, args) {
    socketToUser.get(socket).color = args[1]
    return "Set your chat color to " + args[1]
}));

commands.push(new Command("dog", 1, function(socket, args) {
    sendGlobalMessage(socketToUser.get(socket).name, "(u・ᴥ・u)", socketToUser.get(socket).color)
    return "Sent dog!"
}));

commands.push(new Command("tableflip", 1, function(socket, args) {
    sendGlobalMessage(socketToUser.get(socket).name, "(╯°□°)╯︵ ┻━┻)", socketToUser.get(socket).color)
    return "Sent table flip!"
}));

server.on('connection', function(socket) {
    let socketUser = false
    socket.on('message', function(msge) {
        let msg = JSON.parse(msge)
        console.log(msg)
        if (msg.type == "login") {
            if (getUserByName(msg.name)) {
                sendError(socket, "A user already has this name.")
            } else {
                try {
                    if (msg.name.length > 1 && msg.name.length < 15) {
                        loggedInSockets.push(socket)
                        socketToUser.set(socket, new User(msg.name, socket, "white"))
                        socketUser = socketToUser.get(socket)

                        sendGlobalMessage("Server", `${socketUser.name} has joined the chat!`, "#fcf937");
                        let online = "Online: "
                        loggedInSockets.forEach(s => {
                            online += socketToUser.get(s).name + ", "
                        })

                        online = online.slice(0, -2); 
                        sendPrivateMessage(socket, "Server", online, "#fcf937")
                    } else {
                        sendError(socket, "Length isn't within 2-15 characters.")
                    }
                } catch {
                    sendError(socket, "Error while handling login. Please stop.")
                }
            }
        } else if (msg.type == "message") {
            handleMessage(socket, msg)
        }
    });

    socket.on('close', function() {
        if (socketUser) {
            sendGlobalMessage("Server", `${socketUser.name} has left the chat!`, "#fcf937")
            loggedInSockets = loggedInSockets.filter((s) => s !== socket);
        }
        socketToUser.set(socket, null)
    });
});
