const c = require("./data"); //reference to color array in data.js
const headers = require("./headers");
const { exec } = require('child_process');

//curl ifconfig.me
const myIP = ''
let iteration = 1;

let errorCount = 0;
let bricksFound = 0;

var cron = require("node-cron");
let delay = 0;
cron.schedule("0 7 * * *", () => {
  // displayTrackedParts();
  makeAnnounment(`Good morning, I found ${bricksFound}  new bricks. ${errorCount} errors to report. ${iteration} iterations completed.`, true);
  setTimeout(() => {
    errorCount = 0;
    iteration = 0;
    bricksFound = 0;
  }, 10000)
});

const softParts = [
  {
    itemId: 378,
    wantedColors: [87],
    partNum: 3023,
    partNom: "Plate 1x2",
  },
];

const parts = [
  {
    itemId: 264,
    wantedColors: [13, 32, 108, 220, 228],
    partNum: 3001,
    partNom: "Brick 2x4",
  },
  {
    itemId: 777,
    wantedColors: [228],
    partNum: 3024,
    partNum: 4073,
    partNom: "Plate, Round 1x1",
  },
  {
    itemId: 381,
    wantedColors: [58],
    partNum: 3024,
    partNom: "Plate 1x1",
  },
  {
    itemId: 378,
    wantedColors: [21],
    partNum: 3023,
    partNom: "Plate 1x2",
  },

];


const ovpnDir = './ovpns/us/';
const fs = require('fs');

const ovpns = fs.readdirSync(ovpnDir);



let arrayOfData = [];

parts.forEach((part) => {
  part.wantedColors.forEach((color) =>
    arrayOfData.push({ brickId: part.itemId, colorId: color })
  );
});

function cullFoundParts(partArr) {//removes found parts from array after announced
  //console.log(partArr)
  //console.log(arrayOfData);
  partArr.forEach((part) => {
    const index = arrayOfData.findIndex(x => x.brickId === part.partId && x.colorId === part.colorId);
    if (index > -1) { // only splice array when item is found
      arrayOfData.splice(index, 1); // 2nd parameter means remove one item only
    }

  })
  // console.log(arrayOfData);
}

////////////////////////
const https = require("https");
// const { off } = require("process");

cron.schedule("*/8 * * * *", () => {
  console.log(`iteration ${iteration}`);
  Promise.all(
    arrayOfData.map(({ brickId, colorId }, index) => {
      return getAvail(brickId, colorId, index);
    })
  ).then((AllData) => {
    delay = 0;
    const aviliableBricks = AllData.filter((brickData) => brickData.canBuy);
    if (aviliableBricks.length > 0) {
      let availStr = "";
      for (let l = 0; l < aviliableBricks.length; l++) {
        availStr += `${parts.find((x) => x.itemId == aviliableBricks[l].partId).partNom
          } ${c.colors.find((x) => x.id == aviliableBricks[l].colorId).BLName}\n`;
      }
      console.log("You can buy these bricks:\n" + availStr);
      makeAnnounment("AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA");

      setTimeout(() => {
        makeAnnounment("You can buy these bricks: " + availStr, true)
      }, 10000)
      cullFoundParts(aviliableBricks);

    } else {
      console.log("No new parts.");
    }
    iteration++;
    // console.log(

    //   "You can buy these bricks",
    //   aviliableBricks.map(({ partId, colorId }) => ({ partId, colorId }))
    // );
  });
});



async function getAvail(partId, colorId) {
  return new Promise((resolve, reject) => {
    try {
      const options = {
        host: `www.bricklink.com`,
        path: `/ajax/clone/catalogifs.ajax?itemid=${partId}&color=${colorId}&iconly=0`,
        headers: {
          "User-Agent": generateHeader(),
        },
      };
      delay += randDelay();
      setTimeout(() => {

        checkMyIP().then((isMyIP) => {
          if (isMyIP) {
            switchIP().then(() => {
              console.log("VPN switched.")
              resolve(getAvail(partId, colorId))
            })
          }
          https
            .get(
              options,
              //`https://www.bricklink.com/ajax/clone/catalogifs.ajax?itemid=${partId}&color=${colorId}&iconly=0`,
              (resp) => {
                console.log(
                  `Checking for part ${partId} with color ${colorId} at ${new Date().toLocaleString()} got status code of ${resp.statusCode
                  }`
                );
                if (resp.statusCode == 200) {

                  let data = "";
                  resp.on("data", (chunk) => {
                    data += chunk;
                  });
                  resp.on("end", () => {
                    // let tempPartNom = parts.find((v) => v.itemId == partId).partNom;
                    // let tempColorNom = c.colors.find((x) => x.id == colorId).BLName;
                    //console.log("look at this", data);

                    if (data === "") {
                      throw "empty string";
                    }

                    const dataToDisplay = {
                      partId,
                      colorId,
                      canBuy: JSON.parse(data).total_count !== 0,
                    };

                    resolve(dataToDisplay);

                  });
                } else if (resp.statusCode == 403) {
                  makeAnnounment(`${resp.statusCode} Error`);
                  errorCount++;
                  switchIP();
                } else {
                  makeAnnounment(`${resp.statusCode} Error`);
                }
              }
            )
            .on("error", (err) => {
              console.log(err);
              reject("Error: " + err.message);
            });
        })


      }, delay);
    } catch (err) {
      console.log("oops", err);
      reject("Somethings Wrong...");
    }
  });
}
function generateHeader() {
  return headers.heads[Math.round(Math.random() * (headers.heads.length - 1))];
}
function randDelay() {
  let max = 32000;
  let min = 10000;
  return Math.round(Math.random() * (max - min) + min);
}

function displayTrackedParts() {
  // makeAnnounment("aeiou aeiou aeiou aeiou aeiou aeiou aeiou aeiou aeiou aeiou aeiou aeiou aeiou aeiou aeiou.");
  makeAnnounment("Application started.");
  let str = "";
  for (let l = 0; l < parts.length; l++) {
    if (l === 0) {
      str += `╒`;
      //╕╡┤
    } else {
      str += `╞`;
    }
    str += `═══════════════════════════\n│ ${parts[l].partNom}:\n├───────────────────────────\n`;
    for (let i = 0; i < parts[l].wantedColors.length; i++) {
      str += `│ - ${c.colors.find((x) => x.id == parts[l].wantedColors[i]).BLName
        }\n`;
    }
  }
  str += `╘═══════════════════════════`;
  console.log(str);
}

function makeAnnounment(str, slow = false) {
  exec(`espeak -s ${slow ? 100 : 175} "${str}"`, (err, output) => {
    // once the command has completed, the callback function is called
    if (err) {
      // log and return if we encounter an error
      console.error("could not execute command: ", err)
      return
    }
    // log the output received from the command
    //console.log("Output: \n", output)
  })

}


let vpnIndex = 0;

async function switchIP() {

  return new Promise((resolve) => {

    console.log("Attempting to switch VPN IP")

    if (vpnIndex < ovpns.length - 1) {
      vpnIndex++;
    } else {
      vpnIndex = 0;
    }
    exec(`sudo killall openvpn`, (err, output) => {
      // once the command has completed, the callback function is called
      if (err) {
        // log and return if we encounter an error
        console.error("could not execute command: ", err)
        return
      }
      // log the output received from the command
      console.log("Current VPN Shut Down")
      // console.log("output: \n", output)
    })
    console.log("Waiting 5 seconds to continue...")
    setTimeout(() => {

      console.log("attempting to connect to differnt VPN IP")

      exec(`sudo -b openvpn ./ovpns/us/${ovpns[vpnIndex]}`, (err, output) => {
        // once the command has completed, the callback function is called
        if (err) {
          // log and return if we encounter an error
          console.error("could not execute command: ", err)
          return
        }
        // log the output received from the command
        // console.log("ovpn: \n", ovpns[vpnIndex], "output: \n", output)

        console.log("VPN switched to " + ovpns[vpnIndex] + ", waiting 8 secs...")

        setTimeout(() => resolve(), 8000)

      })

    }, 5000)

  })

}

const http = require('http');

async function checkMyIP() {

  console.log("Checking if personal IP is exposed");

  return new Promise((resolve) => {

    // Set the URL of the request to the ipify API
    const httpoptions = {
      host: 'api.ipify.org',
      port: 80,
      path: '/?format=json'
    };

    // Create a new http.ClientRequest object
    const req = http.request(httpoptions, (res) => {
      // Set the response encoding to utf8
      res.setEncoding('utf8');

      // When a chunk of data is received, append it to the body
      let body = '';
      res.on('data', (chunk) => {
        body += chunk;
      });

      // When the response completes, parse the JSON and log the IP address
      res.on('end', () => {
        const data = JSON.parse(body);
        // if(data.ip == myIP){

        data.ip == myIP && console.log("Personal IP is exposed")
        resolve(data.ip == myIP)

        //console.log(data.ip);
      });
    });


    // Send the request
    req.end();

  })

}


displayTrackedParts();


