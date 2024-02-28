exports.discordView = function (messages) {
    return `
    <!DOCTYPE html>
<head>
    <title>Discord Viewer</title>
    <link href="https://cdn.discordapp.com/emojis/880708306761564220.png" rel="icon" />
    <script>
        window.onload = _ => {
            let doc = document.getElementById("messages");
            if (doc.innerHTML.includes('new_timestamp="')) {
                let matches = doc.innerHTML.match(new RegExp(\`new_timestamp=".*?"\`, "gi"))
                if (matches) {
                    for (const match of matches) {
                        document.getElementById("messages").innerHTML = doc.innerHTML.replace(match, \`timestamp="\${new Date(match.split("new_timestamp=\\"")[1].replace('"', "")).toLocaleString()}"\`)
                    }
                }
            }
            setTimeout(_ => hidePreloader(), 1000)
        }
        function hidePreloader() {
            document.getElementById("load").style.transitionDuration = "0.5s"
            document.getElementById("load").style.pointerEvents = "none"
            document.getElementById("load").style.opacity = 0
            document.getElementById("load").style.zIndex = -1
        }
    </script>
    <script type="module" src="https://unpkg.com/@skyra/discord-components-core" async></script>
    <style>
        /* Preloader styles. */
        #load {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: black;
            z-index: 9999;
            cursor: progress;
        }

        /* Preloader image. */
        #icon {
            width: 200px;
            height: 200px;
            position: absolute;
            background-color: transparent;
            left: 50%;
            top: 50%;
            background-image: url(https://cdn.discordapp.com/emojis/634127148696862753.gif?v=1);
            background-repeat: no-repeat;
            background-position: center;
            margin: -100px 0 0 -100px;
        }
    </style>
</head>

<body style="background: #36393e;">
    <div id="load">
        <div id="icon"></div>
        <br>
        <h3 style="min-height: 110%; display: flex; justify-content: center; align-items: center;">Loading, one moment
            please.</h3>
    </div>
    <discord-messages id="messages">${messages}</discord-messages>
    <br>
    <br>
</body>

</html>
    `;
};
