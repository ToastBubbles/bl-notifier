let iteration = 0;
const parts = [
  {
    itemId: 264,
    wantedColors: [62, 32],
  },
  {
    itemId: 777,
    wantedColors: [83, 2],
  },
];

const https = require("https");
function getAvail(partId, colorId) {
  https
    .get(
      `https://www.bricklink.com/ajax/clone/catalogifs.ajax?itemid=${partId}&color=${colorId}&iconly=0`,
      (resp) => {
        let data = "";

        // A chunk of data has been received.
        resp.on("data", (chunk) => {
          data += chunk;
        });

        // The whole response has been received. Print out the result.
        resp.on("end", () => {
          console.log(
            (JSON.parse(data).total_count &&
              `Brick id:${partId} in color id:${colorId} is available`) ||
              `Brick id:${partId} in color id:${colorId} is NOT available`
          );
        });
      }
    )
    .on("error", (err) => {
      console.log("Error: " + err.message);
    });
}

// function checkParts() {
//   parts.forEach((e) => {
//     for (let i = 0; i < e.wantedColors.length; i++) {
//       // setInterval(function () {
//       getAvail(e.itemId, e.wantedColors[i]);
//       // }, 2000);
//     }
//   });
//   // setInterval(function () {
//   //   checkParts();
//   // }, 2000);
// }

const sleep = (time) => {
  return new Promise((resolve) => setTimeout(resolve, time));
};

const checkParts = async () => {
  for (let l = 0; l < parts.length; l++) {
    for (let i = 0; i < parts[l].wantedColors.length; i++) {
      await sleep(5000);
      iteration++;
      console.log(iteration);
      getAvail(parts[l].itemId, parts[l].wantedColors[i]);
    }
  }
  await sleep(42000); //7 min is 420000
  checkParts();
};

checkParts();
