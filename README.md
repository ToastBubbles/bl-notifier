# scrape-escape

This is an agile API scraper that can adjust its user-agents every call and switch its public IP whenever presented with a 403. 

This NodeJS project was built for Raspberry Pi/UNIX server and is powered by openVPN.

Additional features:

-Text-to-Speech Synthesis for anouncements when a desired piece of data is found.

-SendGrid incorporation allows emails to be sent when desired data is found.

-Includes four modes:
 - Look for any object at all
 - Track certain objects by ID and only update upon new listing
 - Track certain objects by ID and only update upon new listing with an attached comment
 - Check PaB objects for availability
 
 
  
## How to run:

Setup your Raspberry Pi with Unix Server

Remote into the Pi and clone the project


```bash
  git clone https://github.com/ToastBubbles/scrape-escape
```

Navigate to the project directory

```bash
  cd scrape-escape
```

Install dependencies

```bash
  npm i
```

## Initial file setup

Create the files `js/secrets.js` and `keys.js` (keys is in main dir).
`secrets.js` contains your external IP to allow the program to verify if it is correctly being masked.
```bash
  const myIP = xxx.xxx.xxx.xxx;
  exports.myIP = myIP;
```

`keys.js` contains your keys and emails
```bash
  const keys = {
     sender: 'example@temp.co',
     reciever: 'myemail@email.co',
     leg0: 'myTLGKeyHereabcdefghijklmnopqrstuvwxyz'
  };
  exports.keys = keys;
```

Add your VPN credentials to `pass.txt` (these sould be generated for you by your VPN provider)
```bash
  username
  password
```

adjust your wanted objects in `js/wanted.js`

Follow SendGrids official setup guide to establish your profile, sender, and envinromental variable (key).

## Run the project

```bash
  node js/mindex
```
