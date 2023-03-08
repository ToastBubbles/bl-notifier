const { colors, partInfo } = require("/home/projects/js/data"); //reference to color array in data.js
const headers = require("/home/projects/js/headers");
const { exec } = require('child_process');
const { myIP } = require("/home/projects/js/secrets");
const { parts, commentParts, softParts } = require("./wanted");
const { keys } = require("/home/projects/keys");

const http = require('http');
const https = require("https");
var cron = require("node-cron");
const ovpnDir = '/home/projects/ovpns/us/';
const fs = require('fs');
const ovpns = fs.readdirSync(ovpnDir);

const sgMail = require('@sendgrid/mail')
require("dotenv").config()

sgMail.setApiKey(process.env.SENDGRID_API_KEY)

let canEmail = true,
  iteration = 1,
  errorCount = 0,
  bricksFound = 0,
  count = 0,
  delay = 0,
  toggler = 1, //switches which bricks to check each wave
  vpnIndex = 0,
  foundBrickHistory = [],
  arrayOfData = [],
  iterationLimit = 9;

let cachedInventory = {}

cron.schedule("0 7 * * *", () => {
  makeAnnounment(`Good morning, I found ${bricksFound}  new bricks. ${errorCount} errors to report. ${iteration} iterations completed.`, true);
  setTimeout(() => {
    errorCount = 0;
    bricksFound = 0;
  }, 7000)
});

cron.schedule("0 * * * *", () => {
  if (foundBrickHistory.length > 0) {
    makeAnnounment("You have new parts that have been found.");
  }
});
/********************** File System **************************/
function checkForSave() {
  try {
    return fs.existsSync("save.json");
  } catch (e) {
    console.log(e);
  }
}
function load() {
  if (checkForSave()) {
    try {
      let rawdata = fs.readFileSync("save.json");
      let localInfo = JSON.parse(rawdata);
      cachedInventory = localInfo;
    } catch (e) {
      console.log(e);
    }
  } else {
    save();
  }
}
async function save() {
  let data = JSON.stringify(cachedInventory);
  try {
    await fs.writeFileSync("save.json", data);
  } catch (e) {
    console.log(e);
  }
}

load();

function checkId(arr, partName, partNo, partCol) {
  // console.log(`checkid ${partNo} ${partCol}`)
  let thisRef = null;
  let message = ``;
  let output = [];
  if (cachedInventory[partNo] == undefined) {
    cachedInventory[partNo] = [];
  }
  for (let cached of cachedInventory[partNo]) {
    if (cached.partCol == partCol) {
      thisRef = cached;
    }
  }
  if (thisRef == null) {
    cachedInventory[partNo].push({ partCol: partCol, cachedIds: [] });
    thisRef = cachedInventory[partNo][cachedInventory[partNo].length - 1];
  }
  // console.log(arr)
  for (let listing of arr) {
    if (!thisRef.cachedIds.includes(listing.idInv)) {
      console.log(`New ${partCol} ${partName} listed! Seller's note: ${listing.strDesc && "None"} `);
      message += `New ${partCol} ${partName} listed!\n'${listing.strStorename}' note: ${listing.strDesc && "None"} \n${listing.n4Qty} for ${listing.mDisplaySalePrice}\n`;
      output.push(listing);
      thisRef.cachedIds.push(listing.idInv);
    }
  }
  if (output.length >= 1) {

    if (canEmail) { sendEmail(message, partInfo[partNo].num, partCol) }
  }
  save();
}

function filterComments(data, pn) {
  let listingsWithComments = [];
  //   console.log(data[0].list);
  for (let listing of data[0].list) {
    if (listing.strDesc.length > 4) {
      listingsWithComments.push(listing);
    }
  }
  checkId(listingsWithComments, pn, 0);
}


/**********************  **************************/
parts.forEach((part) => {
  part.wantedColors.forEach((color) =>
    arrayOfData.push({ brickId: part.itemId, colorId: color, checkId: "no" })
  );
});
softParts.forEach((part) => {
  part.wantedColors.forEach((color) =>
    arrayOfData.push({ brickId: part.itemId, colorId: color, checkId: "yes" })
  );
});
commentParts.forEach((part) => {
  part.wantedColors.forEach((color) =>
    arrayOfData.push({ brickId: part.itemId, colorId: color, checkId: "comment" })
  );
});

function cullFoundParts(partArr) {//removes found parts from array after announced
  partArr.forEach((part) => {
    foundBrickHistory.push(part);
    const index = arrayOfData.findIndex(x => x.brickId === part.partId && x.colorId === part.colorId);
    if (index > -1) { // only splice array when item is found
      arrayOfData.splice(index, 1); // 2nd parameter means remove one item only
    }

  })
}

let pos = 0;
cron.schedule("*/10 * * * *", async () => {
  console.log(`iteration ${iteration} `);
  let exposedIP = false;
  let conclusion = [];


  checkMyIP().then((isMyIP) => {
    if (isMyIP) {
      exposedIP = true;
      switchIP().then(() => {
        console.log("VPN switched.")
      })
    }
  })
  if (exposedIP) {
    await countdown();
    checkMyIP().then((isMyIP) => {
      if (isMyIP) {
        exposedIP = true;
        switchIP().then(() => {
          console.log("VPN switched.")
        })
      } else {
        exposedIP = false;
      }
    })
  }

  if (!exposedIP) {
    // for (let part of arrayOfData) {
    //     await getAvail(part.brickId, part.colorId, part.checkId).then(datum => conclusion.push(datum))
    //     await countdown();
    // }
    let newPos = 0

    if (iterationLimit > arrayOfData.length - 1) {
      iterationLimit = arrayOfData.length - 1
    }
    while (newPos < iterationLimit) {
      if (pos > arrayOfData.length - 1) {
        pos = 0;
      }
      await getAvail(arrayOfData[pos].brickId, arrayOfData[pos].colorId, arrayOfData[pos].checkId).then(datum => conclusion.push(datum))
      await countdown();
      pos++;
      newPos++;
    }

    count = 0;

    const aviliableBricks = conclusion.filter((brickData) => brickData.canBuy);

    if (aviliableBricks.length > 0) {
      let availStr = "";
      for (let l = 0; l < aviliableBricks.length; l++) {
        // availStr += `${
        parts.find((x) => x.itemId == aviliableBricks[l].partId).partNom
        availStr += `${partInfo[aviliableBricks[l].partId].partName
          } ${colors.find((x) => x.id == aviliableBricks[l].colorId).BLName}\n`;
      }
      console.log("You can buy these bricks:\n" + availStr);
      makeAnnounment("Brick Alert");

      setTimeout(() => {
        makeAnnounment("You can buy these bricks: " + availStr, true)
      }, 6000)
      cullFoundParts(aviliableBricks);

    } else {
      console.log("No new parts.", foundBrickHistory);

    }
    iteration++;
  }
});
// https://www.bricklink.com/v2/catalog/catalogitem.page?P=3001&name=Brick%202%20x%204&category=%5BBrick%5D#T=S&C=7&O={%22color%22:%227%22,%22rpp%22:%22500%22,%22iconly%22:0}
function sendEmail(message, p, c) {
  let day = new Date().toLocaleTimeString()
  console.log(day)
  let url = `https://www.bricklink.com/v2/catalog/catalogitem.page?P=${p}&C=${c}`
  const msg = {
    to: 'jeffneal11@gmail.com', // Change to your recipient
    from: 'toastbubblesbl@gmail.com', // Change to your verified sender
    subject: `BRICKLINK FIND!!!`,
    text: `${message}`,
    html: `<div>${message}</div><div>${day}</div><a href="${url}"><img src='https://img.bricklink.com/ItemImage/PN/${c}/${p}.png' /></a>`,
  }
  sgMail
    .send(msg)
    .then(() => {
      console.log('Email sent')
    })
    .catch((error) => {
      console.error(error)
    })
}

async function getAvail(partId, colorId, mode) {

  return new Promise((resolve, reject) => {
    try {

      const options = {
        host: `www.bricklink.com`,
        path: `/ajax/clone/catalogifs.ajax?itemid=${partId}&color=${colorId}&rpp=500&iconly=0`,
        headers: {
          "User-Agent": generateHeader(),
        },
      };
      let internalDelay = 500;


      console.log('trying ', partId, colorId)
      https
        .get(
          options,
          (resp) => {
            count++;
            // let partNAME = parts.find((x) => x.itemId == partId).partNom;
            // let partNUMB = parts.find((x) => x.itemId == partId).partNum;
            // console.log(partInfo)
            // console.log("**********************")
            // console.log(partInfo[partId])
            // console.log("**********************")
            // console.log(partInfo[partId].name)
            let partNAME = partInfo[partId].name;
            let partNUMB = partInfo[partId].num;
            let colorNAME = colors.find((x) => x.id == colorId).BLName;
            console.log(
              `Checked ${colorNAME} ${partNAME} (${partNUMB}) at ${new Date().toLocaleString()}. (${count}/${arrayOfData.length}), status code: ${resp.statusCode}`
            );
            if (resp.statusCode == 200) {
              let data = "";
              resp.on("data", (chunk) => {
                data += chunk;
              });
              resp.on("end", () => {
                if (data === "") {
                  throw "empty string";
                }
                if (mode == "no") {
                  const dataToDisplay = {
                    partId,
                    colorId,
                    canBuy: JSON.parse(data).total_count !== 0,
                  };
                  if (dataToDisplay.canBuy) {
                    makeAnnounment(`You can buy these bricks: ${partNAME} ${colorNAME}`, true)

                    let message = `${partNAME} ${colorNAME}`
                    if (canEmail) { sendEmail(message, partNUMB, colorId) }
                  }
                  resolve(dataToDisplay);
                } else if (mode == "yes") {
                  const dataToDisplay = {
                    partId,
                    colorId,
                    canBuy: false,
                  };
                  checkId(JSON.parse(data).list, partNAME, partNUMB, colorId);
                  resolve(dataToDisplay);
                } else if (mode == "comment") {
                  const dataToDisplay = {
                    partId,
                    colorId,
                    canBuy: false,
                  };
                  resolve(dataToDisplay);
                }

              });
            } else if (resp.statusCode == 403) {
              console.log('403');

              errorCount++;
              switchIP().then(() => {

                return Promise.reject(err);

                console.log('failed...');
                //getAvail(partId, colorId, (retries - 1), true).then((res) => resolve(res));
              })
            } else {
              errorCount++;
              console.log(resp.statusCode + " is a weird code.")
            }
          }
        )
        .on("error", (err) => {
          console.log(err);
          reject("Error: " + err.message);
        })
        .end();

    } catch (err) {
      console.log("oops", err);
      reject("Somethings Wrong...");
    }
  });
}
function generateHeader() {
  return headers.heads[Math.round(Math.random() * (headers.heads.length - 1))];
}

async function countdown() {
  return new Promise((resolve) => {
    let max = 32000;
    let min = 10000;
    let ms = Math.round(Math.random() * (max - min) + min);
    setTimeout(() => {
      resolve();
    }, ms);
  });
}
function randDelay() {
  let max = 32000;
  let min = 10000;
  return Math.round(Math.random() * (max - min) + min);
}

function displayTrackedParts() {
  makeAnnounment(`Application started. ${arrayOfData.length} parts are being tracked.`);

  let str = "";
  for (let l = 0; l < parts.length; l++) {
    if (l === 0) {
      str += `╒═══════════════════════════╕`;
    } else {
      str += `╞═══════════════════════════╡`;
    }
    str += `\n│ ${parts[l].partNom.padEnd(26)}│\n`
    str += `├───────────────────────────┤\n`;
    for (let i = 0; i < parts[l].wantedColors.length; i++) {
      let colorName = colors.find((x) => x.id == parts[l].wantedColors[i]).BLName
      str += `│ - ${colorName.padEnd(24)}│\n`;
    }
  }
  str += `╘═══════════════════════════╛\n`;
  if (softParts.length > 0) {
    for (let l = 0; l < softParts.length; l++) {
      if (l === 0) {
        str += `╒═══════════════════════════╕`;
      } else {
        str += `╞═══════════════════════════╡`;
      }
      str += `\n│ ${softParts[l].partNom.padEnd(20)}(soft)│\n`
      str += `├───────────────────────────┤\n`;
      for (let i = 0; i < softParts[l].wantedColors.length; i++) {
        let colorName = colors.find((x) => x.id == softParts[l].wantedColors[i]).BLName
        str += `│ - ${colorName.padEnd(24)}│\n`;
      }
    }
    str += `╘═══════════════════════════╛\n`;
  }
  if (commentParts.length > 0) {
    for (let l = 0; l < commentParts.length; l++) {
      if (l === 0) {
        str += `╒═══════════════════════════╕`;
      } else {
        str += `╞═══════════════════════════╡`;
      }
      str += `\n│ ${commentParts[l].partNom.padEnd(17)}(comment)│\n`
      str += `├───────────────────────────┤\n`;
      for (let i = 0; i < commentParts[l].wantedColors.length; i++) {
        let colorName = colors.find((x) => x.id == commentParts[l].wantedColors[i]).BLName
        str += `│ - ${colorName.padEnd(24)}│\n`;
      }
    }
    str += `╘═══════════════════════════╛\n`;
  }
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

  })
}

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
    })
    console.log("Waiting 5 seconds to continue...")
    setTimeout(() => {
      console.log("attempting to connect to differnt VPN IP")
      exec(`sudo -b openvpn /home/projects/ovpns/us/${ovpns[vpnIndex]}`, (err, output) => {
        // once the command has completed, the callback function is called
        if (err) {
          // log and return if we encounter an error
          console.error("could not execute command: ", err)
          return
        }
        // log the output received from the command
        console.log("VPN switched to " + ovpns[vpnIndex] + ", waiting 4 secs...")
        setTimeout(() => resolve(), 4000)
      })
    }, 5000)
  })
}


async function checkMyIP() {
  //console.log("Checking if personal IP is exposed");
  return new Promise((resolve) => {
    // Set the URL of the request to the ipify API
    const httpoptions = {
      host: 'api.ipify.org',
      port: 80,
      path: '/?format=json'
    };
    try {
      console.log('starting ip check')
      http
        .request(httpoptions, (res) => {
          // Set the response encoding to utf8
          res.setEncoding('utf8');
          // When a chunk of data is received, append it to the body
          let body = '';
          res.on('data', (chunk) => {
            body += chunk;
          });
          // When the response completes, parse the JSON and log the IP address
          res.on("error", (err) => {
            console.log('here...')
            console.log(err);
            reject("Error: " + err.message);
          });
          res.on('end', () => {
            if (res.statusCode == 200) {
              const data = JSON.parse(body);
              data.ip == myIP && console.log("Personal IP is exposed")
              resolve(data.ip == myIP)
            } else {
              console.log(res.statusCode + " is IP checker error code.")
              setTimeout(() => {
                checkMyIP();
              }, 2000)
            }
          });

        })
        .on("error", () => {
          console.log("error caught, trying different service");
          checkMyIPAgain().then((res) => {
            resolve(res)
          })
        })
        // Send the request
        .end();
    }
    catch (err) {
      console.log(err)
      errorCount++;
    }
  })
}
async function checkMyIPAgain() {
  //console.log("Checking if personal IP is exposed");
  return new Promise((resolve) => {
    // Set the URL of the request to the ipify API
    const httpoptions = {
      host: 'ident.me',
    };
    try {
      console.log('starting ip check')
      http
        .request(httpoptions, (res) => {
          // Set the response encoding to utf8

          // When a chunk of data is received, append it to the body
          let body = '';
          res.on('data', (chunk) => {
            body += chunk;
          });
          // When the response completes, parse the JSON and log the IP address
          res.on("error", (err) => {
            console.log('here...')
            console.log(err);
            reject("Error: " + err.message);
          });
          res.on('end', () => {
            if (res.statusCode == 200) {

              body == myIP && console.log("Personal IP is exposed")
              resolve(body == myIP)
            } else {
              console.log(res.statusCode + " is IP checker error code.")
              // setTimeout(() => {
              //     checkMyIP();
              // }, 2000)
              resolve(true)
            }
          });

        })
        .on("error", () => {
          console.log("error caught");
          resolve(true)
        })
        // Send the request
        .end();
    }
    catch (err) {
      console.log(err)
      errorCount++;
      resolve(true)
    }
  })
}

displayTrackedParts();

// {
    //       idInv: 337966708,
    //       strDesc: '',
    //       codeNew: 'N',
    //       codeComplete: 'X',
    //       strInvImgUrl: '',
    //       idInvImg: 0,
    //       typeInvImg: '',
    //       n4Qty: 80,
    //       idColorDefault: 228,
    //       typeImgDefault: 'J',
    //       hasExtendedDescription: 0,
    //       instantCheckout: true,
    //       mDisplaySalePrice: 'US $2.00',
    //       mInvSalePrice: 'US $2.00',
    //       nSalePct: 0,
    //       nTier1Qty: 0,
    //       nTier2Qty: 0,
    //       nTier3Qty: 0,
    //       nTier1DisplayPrice: 'US $0.00',
    //       nTier2DisplayPrice: 'US $0.00',
    //       nTier3DisplayPrice: 'US $0.00',
    //       nTier1InvPrice: 'US $0.00',
    //       nTier2InvPrice: 'US $0.00',
    //       nTier3InvPrice: 'US $0.00',
    //       idColor: 228,
    //       strCategory: '5',
    //       strStorename: 'Sweet Little Bricks',
    //       idCurrencyStore: 1,
    //       mMinBuy: 'US $1.00',
    //       strSellerUsername: 'SweetLBricks',
    //       n4SellerFeedbackScore: 361,
    //       strSellerCountryName: 'USA',
    //       strSellerCountryCode: 'US',
    //       strColor: 'Satin Trans-Clear'
    //     },