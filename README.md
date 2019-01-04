# Hueseum

Marie Konopacki\
Will Rowley\
Teddy Sevilla

mariekonopacki@college.harvard.edu\
wrowley@college.harvard.edu\
esevilla@college.harvard.edu

## Objective

This project serves to be a research tool for researching color trends in
paintings that are in the Harvard Art museums database. It allows you to either
search by hex code or by uploading a painting, and returns a list of paintings
that have color compositions composed by the colors searched. You can then filter
by location and if searching for a single hex code, adjust the sensitivity of the
query. By logging, the site will keep track of recent searches, as well as favorite
paintings.

## How to run

Download the folder to your computer or clone the repository. In your terminal,
navigate into the downloaded folder or cloned repository. You must have both node
and npm installed to tun this program. and In the terminal, be sure to run
"npm install" followed by "node app.js". In your browser, navigate to
http://localhost:8080.

## Will's Contribution

My role in this project was primarily in researching and implementing how
we would go about searching for colors in a database as well as searching by
uploading. This started off by researching colors and color comparison. While
good for displaying and describing colors, RBG color space isn't ideal for
comparing colors, as humans dont perceive RBG space as uniform. I implemented code
to convert RBG colors into the Lab color space, which is perceptually
uniform for humans. This allowed me to write code to both identify color
representation in a painting as well as measure how similar two paintings are
in color composition. This code can be found in the "color" folder.

In order to extract the color data from a user uploaded photo, I adapted the
code in the color-service folder from code provided to us by the Harvard Art Museums.
I adapted this code from a php web server into a command line program that we app.js.

Finally, I designed and implemented algorithms that searched the database
for what the user specified. I would query the database, either filter or
sort the results, then prep the data for presentation. This code can be found in
lines 279 throughout the rest of the file in app.js.
