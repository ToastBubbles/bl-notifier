const c = require("./data"); //reference to color array in data.js
const headers = require("./headers");
// easyvpn -c US;
let iteration = 1;

var cron = require("node-cron");
let delay = 0;
cron.schedule("39 19 * * *", () => {
  displayTrackedParts();
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

let arrayOfData = [];

parts.forEach((part) => {
  part.wantedColors.forEach((color) =>
    arrayOfData.push({ brickId: part.itemId, colorId: color })
  );
});

////////////////////////
const https = require("https");
const { off } = require("process");

cron.schedule("*/10 * * * *", () => {
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
        availStr += `${
          parts.find((x) => x.itemId == aviliableBricks[l].partId).partNom
        } ${c.colors.find((x) => x.id == aviliableBricks[l].colorId).BLName}\n`;
      }
      console.log("You can buy these bricks:\n" + availStr);
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

async function getAvail(partId, colorId, offset) {
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
        https
          .get(
            options,
            //`https://www.bricklink.com/ajax/clone/catalogifs.ajax?itemid=${partId}&color=${colorId}&iconly=0`,
            (resp) => {
              console.log(
                `Checking for part ${partId} with color ${colorId} at ${new Date().toLocaleString()} got status code of ${
                  resp.statusCode
                }`
              );

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
            }
          )
          .on("error", (err) => {
            console.log(err);
            reject("Error: " + err.message);
          });
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
      str += `│ - ${
        c.colors.find((x) => x.id == parts[l].wantedColors[i]).BLName
      }\n`;
    }
  }
  str += `╘═══════════════════════════`;
  console.log(str);
}

displayTrackedParts();

// for (let i = 0; i < 10; i++) {
//   console.log(generateHeader());
// }

// checkParts();
// cron.schedule("*/7 * * * *", () => {
//   checkParts();
// });
