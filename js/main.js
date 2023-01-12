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
    {
      itemId: 272,
      wantedColors: [21, 105],
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
  //console.log(arrayOfData);
  function cullFoundParts(partArr){//removes found parts from array after announced
    console.log(arrayOfData);
     partArr.forEach((part) =>{
      const index = arrayOfData.findIndex(x => x.brickId === part.brickId && x.colorId === part.colorId );
      if (index > -1) { // only splice array when item is found
         arrayOfData.splice(index, 1); // 2nd parameter means remove one item only
      } 
  
     })
     console.log(arrayOfData);
  }


let cullparts =[{ brickId: 264, colorId: 220 },
    { brickId: 264, colorId: 228 },
    { brickId: 272, colorId: 21 },];

    cullFoundParts(cullparts)