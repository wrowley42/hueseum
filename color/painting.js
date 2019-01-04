const colorMod = require('./color.js');

// sample node commands
// > let p = new Painting(sample1);
// undefined
// > p.singleColorCompare("#ff0000");
// 0
// > p.singleColorCompare("#c8c8c8");
// 43.642857142857
// > p.wholePaintingCompare(sample1);
// { percent: 0.999999999999999, total: 9 }
// > p.wholePaintingCompare(sample2)
// { percent: 0.18104117876658402, total: 3 }

// Sample Data
let sample1 = [
  {
    "percent": 0.43642857142857,
    "spectrum": "#8c5fa8",
    "color": "#c8c8c8",
    "css3": "#c0c0c0",
    "hue": "Grey"
  },
  {
    "percent": 0.1864880952381,
    "spectrum": "#8c5fa8",
    "color": "#afafaf",
    "css3": "#a9a9a9",
    "hue": "Grey"
  },
  {
    "percent": 0.12803571428571,
    "spectrum": "#2eb45d",
    "color": "#323232",
    "css3": "#2f4f4f",
    "hue": "Grey"
  },
  {
    "percent": 0.092142857142857,
    "spectrum": "#3db657",
    "color": "#4b4b4b",
    "css3": "#2f4f4f",
    "hue": "Grey"
  },
  {
    "percent": 0.06297619047619,
    "spectrum": "#7866ad",
    "color": "#646464",
    "css3": "#696969",
    "hue": "Grey"
  },
  {
    "percent": 0.051964285714286,
    "spectrum": "#955ba5",
    "color": "#e1e1e1",
    "css3": "#dcdcdc",
    "hue": "Grey"
  },
  {
    "percent": 0.0175,
    "spectrum": "#8362aa",
    "color": "#7d7d7d",
    "css3": "#808080",
    "hue": "Grey"
  },
  {
    "percent": 0.014345238095238,
    "spectrum": "#8761aa",
    "color": "#969696",
    "css3": "#a9a9a9",
    "hue": "Grey"
  },
  {
    "percent": 0.010119047619048,
    "spectrum": "#1eb264",
    "color": "#191919",
    "css3": "#000000",
    "hue": "Grey"
  }
];

exports.Painting = class Painting {
  constructor(data){
    this.dataParser = dataParser,
    this.colorValues = dataParser(data);
  }
  // gives you a value for how well a color is represented in a Painting
  // Uses the most well represented color in the painting to determine this
  // value
  singleColorCompare(hex){
    let clr = new colorMod.Color(hex);
    let max = 0;
    var i;
    for (i = 0; i < this.colorValues.length; i++) {
      if (weightedComparison(clr, this.colorValues[i]) > max) {
        max = weightedComparison(clr, this.colorValues[i])
      }
    }
    return max;
  }
  // Compares the color values in this painting to the color
  // values of another. Returns total percent match and number
  // of colors matched
  wholePaintingCompare(data){
    let dataColorValues = dataParser(data);
    let matchPercent = 0;
    let matchTotals = 0;
    for (var i = 0; i < dataColorValues.length; i++) {
      let compareValue = this.singleColorCompare(dataColorValues[i].hex);
      if (compareValue != 0) {
        matchTotals++;
      }
      if (compareValue < dataColorValues[i].percent) {
        matchPercent += compareValue;
      } else {
        matchPercent += dataColorValues[i].percent
      }
    }
    return {"percent": matchPercent, "total": matchTotals};
  }
};

function weightedComparison(color, obj) {
  if (color.difference(obj.hex) < 15)
  return obj.percent;
  else {
    return 0;
  }
}

// used to parse the incoming data to what will be used by the functions
function dataParser(data) {
  let returnValue = [];
  for (i = 0; i < data.length; i++) {
    returnValue.push({"percent": data[i].percent, "hex": data[i].color})
  }
  return returnValue;
};
