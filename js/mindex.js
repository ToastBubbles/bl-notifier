const c = require("./data"); //reference to color array in data.js
const headers = require("./headers");
const fs = require("fs");
const { parts, commentParts } = require("./wanted");
// const c = require("./wante");

let iteration = 1;
let delay;

//////////////////////////////NEW
let toggler = 2;
let cachedInventory = {
  //   0: [
  //     {
  //       partCol: 0,
  //       cachedIds,
  //     },
  //   ],
  //   3001: [
  //     {
  //       partCol: 1,
  //       cachedIds: [],
  //     },
  //     {
  //       partCol: 224,
  //       cachedIds: [],
  //     },
  //   ],
};

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

function checkId(arr, partNo, partCol) {
  let thisRef = null;
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
  for (let listing of arr) {
    if (!thisRef.cachedIds.includes(listing.idInv)) {
      console.log("NEW ITEM WITH COMMENT");
      console.log(listing.strDesc);
      thisRef.cachedIds.push(listing.idInv);
    }
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

/////////////////////////////////////////

let arrayOfData = [];
let arrayOfData2 = [];

parts.forEach((part) => {
  part.wantedColors.forEach((color) =>
    arrayOfData.push({ brickId: part.itemId, colorId: color })
  );
});

commentParts.forEach((part) => {
  part.wantedColors.forEach((color) =>
    arrayOfData2.push({ brickId: part.itemId, colorId: color })
  );
});

function cullFoundParts(partArr) {
  partArr.forEach((part) => {
    const index = arrayOfData.findIndex(
      (x) => x.brickId === part.partId && x.colorId === part.colorId
    );
    if (index > -1) {
      // only splice array when item is found
      arrayOfData.splice(index, 1); // 2nd parameter means remove one item only
    }
  });
}

const https = require("https");

function start() {
  console.log(`iteration ${iteration}`);
  if (toggler == 1) {
    Promise.all(
      arrayOfData.map(({ brickId, colorId }) => {
        return getAvail(brickId, colorId, toggler);
      })
    ).then((AllData) => {
      delay = 0;
      const aviliableBricks = AllData.filter((brickData) => brickData.canBuy);
      if (aviliableBricks.length > 0) {
        let availStr = "";
        for (let l = 0; l < aviliableBricks.length; l++) {
          availStr += `${
            parts.find((x) => x.itemId == aviliableBricks[l].partId).partNom
          } ${
            c.colors.find((x) => x.id == aviliableBricks[l].colorId).BLName
          }\n`;
        }
        console.log("You can buy these bricks:\n" + availStr);

        cullFoundParts(aviliableBricks);
      } else {
        console.log("No new parts.");
      }
      iteration++;

      toggler = 2;
    });
  } else if (toggler == 2) {
    Promise.all(
      arrayOfData2.map(({ brickId, colorId }) => {
        return getAvail(brickId, colorId, toggler);
      })
    ).then((AllData) => {
      //   delay = 0;
      //   const aviliableBricks = AllData.filter((brickData) => brickData.canBuy);
      //   if (aviliableBricks.length > 0) {
      //     let availStr = "";
      //     for (let l = 0; l < aviliableBricks.length; l++) {
      //       availStr += `${
      //         parts.find((x) => x.itemId == aviliableBricks[l].partId).partNom
      //       } ${
      //         c.colors.find((x) => x.id == aviliableBricks[l].colorId).BLName
      //       }\n`;
      //     }
      //     console.log("You can buy these bricks:\n" + availStr);

      //     cullFoundParts(aviliableBricks);
      //   } else {
      //     console.log("No new parts.");
      //   }
      //   iteration++;
      //   console.log(AllData.list);
      //   console.log(AllData);
      filterComments(AllData, 0);
      toggler = 1;
    });
  }
  //    else if (toggler == 3) {
  //     Promise.all(
  //       arrayOfData2.map(({ brickId, colorId }) => {
  //         return getAvail(brickId, colorId, toggler);
  //       })
  //     ).then((AllData) => {
  //       toggler = 3;
  //     });
  //     toggler == 1;
  //   }
}

start();

async function getAvail(partId, colorId, mode) {
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

      https
        .get(
          options,

          (resp) => {
            console.log(
              `Checking for part ${partId} with color ${colorId} at ${new Date().toLocaleString()} got status code of ${
                resp.statusCode
              }`
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
                // console.log(JSON.parse(data));
                // filterComments(JSON.parse(data), partId);

                if (mode == 1) {
                  const dataToDisplay = {
                    partId,
                    colorId,
                    canBuy: JSON.parse(data).total_count !== 0,
                  };
                  resolve(dataToDisplay);
                } else if (mode == 2) {
                  resolve(JSON.parse(data));
                }
              });
            } else if (resp.statusCode == 403) {
              console.log("e1");
              errorCount++;
              switchIP();
            } else {
              console.log("e2");
            }
          }
        )
        .on("error", (err) => {
          console.log(err);
          reject("Error: " + err.message);
        });
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

function displayTrackedParts(p) {
  let str = "";
  for (let l = 0; l < p.length; l++) {
    if (l === 0) {
      str += `╒`;
      //╕╡┤
    } else {
      str += `╞`;
    }
    str += `═══════════════════════════\n│ ${p[l].partNom}:\n├───────────────────────────\n`;
    for (let i = 0; i < p[l].wantedColors.length; i++) {
      str += `│ - ${
        c.colors.find((x) => x.id == p[l].wantedColors[i]).BLName
      }\n`;
    }
  }
  str += `╘═══════════════════════════`;
  console.log(str);
}

displayTrackedParts(commentParts);

// {
//   total_count: 3,
//   idColor: 228,
//   rpp: 25,
//   pi: 1,
//   list: [
//     {
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
//     {
//       idInv: 338472677,
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
//       mDisplaySalePrice: 'US $2.95',
//       mInvSalePrice: 'US $2.95',
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
//       strStorename: '3001Bricks',
//       idCurrencyStore: 1,
//       mMinBuy: 'None',
//       strSellerUsername: '3001Bricks',
//       n4SellerFeedbackScore: 1873,
//       strSellerCountryName: 'USA',
//       strSellerCountryCode: 'US',
//       strColor: 'Satin Trans-Clear'
//     },
//     {
//       idInv: 338131743,
//       strDesc: '',
//       codeNew: 'N',
//       codeComplete: 'X',
//       strInvImgUrl: '',
//       idInvImg: 0,
//       typeInvImg: '',
//       n4Qty: 16,
//       idColorDefault: 228,
//       typeImgDefault: 'J',
//       hasExtendedDescription: 0,
//       instantCheckout: true,
//       mDisplaySalePrice: 'US $2.95',
//       mInvSalePrice: 'US $2.95',
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
//       strStorename: '941BrickGuy',
//       idCurrencyStore: 1,
//       mMinBuy: 'US $2.00',
//       strSellerUsername: '941brickguy',
//       n4SellerFeedbackScore: 371,
//       strSellerCountryName: 'USA',
//       strSellerCountryCode: 'US',
//       strColor: 'Satin Trans-Clear'
//     }
//   ],
//   returnCode: 0,
//   returnMessage: 'OK',
//   errorTicket: 0,
//   procssingTime: 31
// }
