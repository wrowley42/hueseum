// Conversions obtained from easyrgb.com
exports.Color = class Color {
  constructor(hex){
    // hex to rgb obtained from https://stackoverflow.com/questions/5623838/
    // rgb-to-hex-and-hex-to-rgb
    var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    // rgb color space
    this.r = parseInt(result[1], 16),
    this.b = parseInt(result[2], 16),
    this.g = parseInt(result[3], 16),
    // XYZ color space conversions / variables from rgb space
    this.RGBtoXYZ = RGBtoXYZ,
    this.XYZ = RGBtoXYZ(this.r, this.b, this.g),
    this.X = this.XYZ[0],
    this.Y = this.XYZ[1],
    this.Z = this.XYZ[2],
    // lab color Conversions
    this.XYZtoLAB = XYZtoLAB,
    this.Lab = XYZtoLAB(this.X, this.Y, this.Z),
    this.L = this.Lab[0],
    this.a = this.Lab[1],
    this.b = this.Lab[2]
  }
  difference(hex){
    let other = new Color(hex);
    return Math.sqrt((Math.pow((other.L - this.L), 2)) +
    (Math.pow((other.a - this.a), 2)) +
    (Math.pow((other.b - this.b), 2)))
  }
};

// conversion from xyz to lab
function XYZtoLAB(x, y, z){
  let _X = x / 95.047;
  let _Y = y / 100;
  let _Z = z / 108.883;
  // doin the thang to X
  if (_X > 0.008856) {
    _X = Math.pow(_X, 1/3)
  } else {
    _X = (7.787 * _X) + (16 / 116)
  }
  // doin the thang to Z
  if (_Y > 0.008856) {
    _Y = Math.pow(_Y, 1/3)
  } else {
    _Y = (7.787 * _Y) + (16 / 116)
  }
  // doin the thang to Z
  if (_Z > 0.008856) {
    _Z = Math.pow(_Z, 1/3)
  } else {
    _Z = (7.787 * _Z) + (16 / 116)
  }
  let L = ( 116 * _Y ) - 16;
  let a = 500 * ( _X - _Y );
  let b = 200 * ( _Y - _Z );
  return[L,a,b]
}

// conversion from rbg to xyz
function RGBtoXYZ(r, b, g) {
  let _R = r / 255;
  let _G = g / 255;
  let _B = b / 255;
  // adjusting the R variable
  if (_R > 0.04045) {
    _R = Math.pow(((_R + 0.055) / 1.055), 2.4)
  } else {
    _R = _R / 12.92
  }
  // Adjusting the G variable
  if (_G > 0.04045) {
    _G = Math.pow(((_G + 0.055) / 1.055), 2.4)
  } else {
    _G = _G / 12.92
  }
  // Adjusting the B variable
  if (_B > 0.04045) {
    _B = Math.pow(((_B + 0.055) / 1.055), 2.4)
  } else {
    _B = _B / 12.92
  }
  // a final adjustment to them all
  _R = _R * 100;
  _G = _G * 100;
  _B = _B * 100;
  // getting the X Y and Z values
  let X = _R * 0.4124 + _G * 0.3576 + _B * 0.1805;
  let Y = _R * 0.2126 + _G * 0.7152 + _B * 0.0722;
  let Z = _R * 0.0193 + _G * 0.1192 + _B * 0.9505;
  return[X,Y,Z]
}
