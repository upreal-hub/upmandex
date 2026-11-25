CREATE TABLE IF NOT EXISTS "TwitchCommandCatalog" (
  "id" TEXT PRIMARY KEY CHECK ("id" = 'official'),
  "revision" INTEGER NOT NULL CHECK ("revision" >= 0),
  "catalog" JSONB NOT NULL
);

INSERT INTO "TwitchCommandCatalog" ("id", "revision", "catalog") VALUES ('official', 0, $catalog$
{
  "categories": [
    {
      "title": "Chat & Fun",
      "id": "chat",
      "order": 0
    },
    {
      "title": "Gartic & Games",
      "id": "games",
      "order": 10
    },
    {
      "title": "UPMANDEX & Community",
      "id": "community",
      "order": 20
    },
    {
      "title": "Music",
      "id": "music",
      "order": 30
    },
    {
      "title": "Stream Information",
      "id": "stream",
      "order": 40
    }
  ],
  "commands": [
    {
      "id": "8ball",
      "categoryId": "chat",
      "syntax": "!8ball <question>",
      "description": "Ask the magic ball a question.",
      "example": "!8ball Will we win the next round?",
      "icon": "🎱",
      "global": 10,
      "viewer": 30,
      "aliases": [],
      "visible": true,
      "order": 0
    },
    {
      "id": "dadjoke",
      "categoryId": "chat",
      "syntax": "!dadjoke",
      "description": "Ask chat for a dad joke.",
      "example": "!dadjoke",
      "icon": "😄",
      "global": 60,
      "viewer": 20,
      "aliases": [],
      "visible": true,
      "order": 10
    },
    {
      "id": "hug",
      "categoryId": "chat",
      "syntax": "!hug @username",
      "description": "Send a virtual hug to another viewer.",
      "example": "!hug @cloudviewer",
      "icon": "🤗",
      "global": 0,
      "viewer": 3,
      "aliases": [],
      "visible": true,
      "order": 20
    },
    {
      "id": "fuck",
      "categoryId": "chat",
      "syntax": "!fuck @username",
      "description": "Use the stream's cheeky chat interaction with another viewer.",
      "example": "!fuck @cloudviewer",
      "icon": "⚡",
      "global": 0,
      "viewer": 0,
      "aliases": [],
      "visible": true,
      "order": 30
    },
    {
      "id": "wyr",
      "categoryId": "chat",
      "syntax": "!wyr",
      "description": "Get a Would You Rather question.",
      "example": "!wyr",
      "icon": "🤔",
      "global": 60,
      "viewer": 0,
      "aliases": [],
      "visible": true,
      "order": 40
    },
    {
      "id": "lurk",
      "categoryId": "chat",
      "syntax": "!lurk",
      "description": "Let chat know you're watching in the background.",
      "example": "!lurk",
      "icon": "👀",
      "global": 0,
      "viewer": 0,
      "aliases": [
        "!brb",
        "!lurking",
        "!imstillwatching"
      ],
      "visible": true,
      "order": 50
    },
    {
      "id": "link",
      "categoryId": "games",
      "syntax": "!link",
      "description": "Get the current Gartic room link when one is set.",
      "example": "!link",
      "icon": "🎨",
      "global": 0,
      "viewer": 0,
      "aliases": [
        "!gartic",
        "!iwannajoin",
        "!join",
        "!garticlink",
        "!linkpls"
      ],
      "visible": true,
      "order": 0
    },
    {
      "id": "nata",
      "categoryId": "games",
      "syntax": "!nata <mode>",
      "description": "Get the gallery link for the specified Gartic mode.",
      "example": "!nata normal",
      "icon": "🖼️",
      "global": 0,
      "viewer": 0,
      "aliases": [
        "!natiedeboozy",
        "!mother",
        "!barbie",
        "!mode",
        "!modegallery"
      ],
      "visible": true,
      "order": 10
    },
    {
      "id": "deaths",
      "categoryId": "games",
      "syntax": "!deaths",
      "description": "Check the death count for the current game.",
      "example": "!deaths",
      "icon": "💀",
      "global": 0,
      "viewer": 0,
      "aliases": [],
      "visible": true,
      "order": 20
    },
    {
      "id": "marblerules",
      "categoryId": "games",
      "syntax": "!marblerules",
      "description": "Learn the rules of Marble Race.",
      "example": "!marblerules",
      "icon": "🏁",
      "global": 0,
      "viewer": 0,
      "aliases": [],
      "visible": true,
      "order": 30
    },
    {
      "id": "upmandex",
      "categoryId": "community",
      "syntax": "!upmandex",
      "description": "Get the link to https://upmandex.com. The !dex alias and 15-second global cooldown are planned.",
      "example": "!upmandex",
      "icon": "📘",
      "global": 15,
      "viewer": 0,
      "aliases": [
        "!dex"
      ],
      "visible": true,
      "order": 0
    },
    {
      "id": "drop",
      "categoryId": "community",
      "syntax": "!drop",
      "description": "Trigger an Uppy drop on the stream.",
      "example": "!drop",
      "icon": "☁️",
      "global": 0,
      "viewer": 0,
      "aliases": [],
      "visible": true,
      "order": 10
    },
    {
      "id": "discord",
      "categoryId": "community",
      "syntax": "!discord",
      "description": "Get the link to the community Discord.",
      "example": "!discord",
      "icon": "💬",
      "global": 0,
      "viewer": 0,
      "aliases": [
        "!uprealdih",
        "!dihcord",
        "!dicord",
        "!Dcord"
      ],
      "visible": true,
      "order": 20
    },
    {
      "id": "sr",
      "categoryId": "music",
      "syntax": "!sr <song or URL>",
      "description": "Request a song by title or URL.",
      "example": "!sr Daft Punk - One More Time",
      "icon": "🎵",
      "global": 0,
      "viewer": 10,
      "aliases": [],
      "visible": true,
      "order": 0
    },
    {
      "id": "song",
      "categoryId": "music",
      "syntax": "!song",
      "description": "See which track is playing.",
      "example": "!song",
      "icon": "🎧",
      "global": 60,
      "viewer": 0,
      "aliases": [
        "!songname"
      ],
      "visible": true,
      "order": 10
    },
    {
      "id": "queue",
      "categoryId": "music",
      "syntax": "!queue",
      "description": "View the song request queue.",
      "example": "!queue",
      "icon": "📋",
      "global": 30,
      "viewer": 0,
      "aliases": [],
      "visible": true,
      "order": 20
    },
    {
      "id": "when",
      "categoryId": "music",
      "syntax": "!when",
      "description": "Check when your song request is coming up.",
      "example": "!when",
      "icon": "⏳",
      "global": 0,
      "viewer": 30,
      "aliases": [],
      "visible": true,
      "order": 30
    },
    {
      "id": "voteskip",
      "categoryId": "music",
      "syntax": "!voteskip",
      "description": "Vote to skip the current track.",
      "example": "!voteskip",
      "icon": "⏭️",
      "global": 0,
      "viewer": 60,
      "aliases": [
        "!skipvote"
      ],
      "visible": true,
      "order": 40
    },
    {
      "id": "wrongsong",
      "categoryId": "music",
      "syntax": "!wrongsong",
      "description": "Flag an incorrect song request.",
      "example": "!wrongsong",
      "icon": "↩️",
      "global": 0,
      "viewer": 60,
      "aliases": [
        "!songwrong"
      ],
      "visible": true,
      "order": 50
    },
    {
      "id": "uptime",
      "categoryId": "stream",
      "syntax": "!uptime",
      "description": "Check how long the stream has been live.",
      "example": "!uptime",
      "icon": "⏱️",
      "global": 0,
      "viewer": 0,
      "aliases": [],
      "visible": true,
      "order": 0
    },
    {
      "id": "followage",
      "categoryId": "stream",
      "syntax": "!followage [username]",
      "description": "Check how long you or another viewer have followed the channel.",
      "example": "!followage cloudviewer",
      "icon": "💜",
      "global": 0,
      "viewer": 0,
      "aliases": [],
      "visible": true,
      "order": 10
    },
    {
      "id": "followers",
      "categoryId": "stream",
      "syntax": "!followers",
      "description": "Check the channel's follower count.",
      "example": "!followers",
      "icon": "👥",
      "global": 0,
      "viewer": 0,
      "aliases": [],
      "visible": true,
      "order": 20
    },
    {
      "id": "accountage",
      "categoryId": "stream",
      "syntax": "!accountAge [username]",
      "description": "Check the age of your Twitch account or another viewer's account.",
      "example": "!accountAge cloudviewer",
      "icon": "👤",
      "global": 0,
      "viewer": 0,
      "aliases": [],
      "visible": true,
      "order": 30
    },
    {
      "id": "date",
      "categoryId": "stream",
      "syntax": "!date",
      "description": "Show the current date.",
      "example": "!date",
      "icon": "📅",
      "global": 0,
      "viewer": 0,
      "aliases": [],
      "visible": true,
      "order": 40
    },
    {
      "id": "clip",
      "categoryId": "stream",
      "syntax": "!clip",
      "description": "Request a clip of the live stream.",
      "example": "!clip",
      "icon": "🎬",
      "global": 60,
      "viewer": 0,
      "aliases": [],
      "visible": true,
      "order": 50
    }
  ]
}
$catalog$::jsonb)
ON CONFLICT ("id") DO NOTHING;
