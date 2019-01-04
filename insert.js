const sqlite3 = require('sqlite3').verbose();
const fetch = require("node-fetch")
const API_KEY = "65a62630-b77e-11e8-a4d1-69890776a30b"

let db = new sqlite3.Database('./db/huseum.db', sqlite3.OPEN_READWRITE, (err) => {
  if (err) {
    console.error(err.message);
  }
  console.log('Connected to the huseum database.');
  const url = `https://api.harvardartmuseums.org/object?apikey=${API_KEY}&classification=Paintings&color=any`
  loadObjectInfo(url)
});

// insert one row into the langs table
function insertPaintingRow (title, year, accession, provenance, creation_place, image_URL, object_id, callback){
  db.run(`INSERT INTO paintings(title, year, accession, provenance, creation_place, image_url, object_id) VALUES(?,?,?,?,?,?,?)`, [title, year, accession, provenance, creation_place, image_URL, object_id], function(err) {
    if (err) {
      console.log(err.message);
      return callback(err);
    }
    console.log(`A row has been inserted with rowid ${this.lastID}`);
    return callback(null);
    // get the last insert id
  });
}

// insert one row into the langs table
function insertColorsRow (painting_id, hex_code, hex_code_percent, css3, hue){
  db.run(`INSERT INTO colors(painting_id, hex_code, hex_code_percent, css3, hue) VALUES(?,?,?,?,?)`, [painting_id, hex_code, hex_code_percent, css3, hue], function(err) {
    if (err) {
      return console.log(err.message);
    }
    // get the last insert id
    console.log(`A row has been inserted with rowid ${this.lastID}`);
  });
}

function loadObjectInfo(url) {
  fetch(url)
  .then(response => response.json())
  .then(data => {
    data.records.forEach(object => {
      objectid = object.id
      objecttitle = object.title
      year = object.datebegin
      accession = object.accessionyear
      provenance = object.provenance
      creation_place = object.culture
      image_URL = object.primaryimageurl
      insertPaintingRow(objecttitle, year, accession, provenance, creation_place, image_URL, objectid, function(err) {
        db.get(`SELECT painting_id FROM paintings WHERE object_id = '${objectid}'`, function(err, result){
          if (err) {
            return console.log(err.message);
          }
          if (object.colors) {
            for (let color of (object.colors)) {
              object_id = result.painting_id
              hex_code_unsliced = color.color
              hex_code = hex_code_unsliced.slice(1)
              hex_code_percent = color.percent
              css3_unsliced = color.css3
              css3 = css3_unsliced.slice(1)
              hue = color.hue
              insertColorsRow(object_id, hex_code, hex_code_percent, css3, hue)
            }
          }
        })
      }
    });
    if (data.info.next) {
      loadObjectInfo(data.info.next)
    }
  });
}
