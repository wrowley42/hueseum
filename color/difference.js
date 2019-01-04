/*

this is a command line program that give the delta E (CIE76) in the L*ab color
space. This color space is designed to be percetually uniform, and is the
color science standard for determining color similarity

to run -

node difference.js "#$$$$$$" "#$$$$$$"

optional 3rd parameter allows you to set the delta E threshold for similarity

*/

const colorMod = require('./color.js');
'use strict';

// first color
let clr = new colorMod.Color(process.argv[2]);
// calculates delta E between the second and third arguments
let difference = clr.difference(process.argv[3]);
// set the threshold to 2.3 (JND), or to whatever the 3rd argument is
let threshold = 2.3;
if (process.argv[4]) {
    threshold = parseInt(process.argv[4])
}
// give the results
console.log("\nThe difference is " + difference);
if (difference < threshold) {
    console.log("\nThe difference is within the threshold")
} else {
    console.log("\nThe difference is not within the threshold")
}
