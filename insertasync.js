const sqlite3 = require('sqlite3').verbose();
const fetch = require("node-fetch")
const API_KEY = "65a62630-b77e-11e8-a4d1-69890776a30b"
const async = require("async")
const series = require('async-each-series');
// import waterfall from 'async/waterfall';

let db = new sqlite3.Database('./db/huseum.db', sqlite3.OPEN_READWRITE, (err) => {
  if (err) {
    console.error(err.message);
  }
  console.log('Connected to the huseum database.');
  const url = `https://api.harvardartmuseums.org/object?apikey=${API_KEY}&classification=Paintings&color=any&image=any`
  loadObjectInfo(url)
})

function loadObjectInfo(url) {
  fetch(url)
  .then(response => response.json())
  .then(data => {
    data.records.forEach(object => {
      objectcontent = object
      objectid = objectcontent.id
      objecttitle = objectcontent.title
      year = objectcontent.datebegin
      accession = objectcontent.accessionyear
      provenance = objectcontent.provenance
      creation_place = objectcontent.culture
      image_URL = objectcontent.primaryimageurl
      artists = object.people
      let artistname
      if (artists) {
        artistname = artists[0].name
      }
      if (image_URL) {
        async.waterfall([
          // move outside waterfall until parameters actually need to be passed
          //could be passing in an object or a full row
          function(callback) {
            callback(null, objecttitle, year, accession, provenance, creation_place, image_URL, objectid, artistname, objectcontent);
          },
          function(objecttitle, year, accession, provenance, creation_place, image_URL, objectid, artistname, objectcontent, callback) {
            // console.log(objecttitle)
            console.log(artistname)
            db.run(`INSERT INTO paintings(title, year, accession, provenance, creation_place, image_url, object_id, artist) VALUES(?,?,?,?,?,?,?,?)`, [objecttitle, year, accession, provenance, creation_place, image_URL, objectid, artistname], (err, result) => {
              if (err) {
                return err;
              }
              // get the last insert id
              console.log(`A row has been inserted with rowid ${this.lastID}`);
              callback(null, objectcontent)
            });
          },
          function(objectcontent, callback) {
            object_id = objectcontent.id
            db.get(`SELECT painting_id FROM paintings WHERE object_id = ?`, object_id, function(err, result){
              if (err) {
                return console.log(err.message);
              }
              else {
                // console.log(`Row selected`);
                paintingid = result.painting_id
              }
              callback(null, paintingid, objectcontent)
            })
          },
          function(paintingid, objectcontent, callback) {
            if (objectcontent.colors) {
              for (let color of (objectcontent.colors)) {
                object_id = paintingid
                hex_code_unsliced = color.color
                hex_code = hex_code_unsliced.slice(1)
                hex_code_percent = color.percent
                css3_unsliced = color.css3
                css3 = css3_unsliced.slice(1)
                hue = color.hue
                async.waterfall([
                  function(callback) {
                    callback(null, object_id, hex_code, hex_code_percent, css3, hue);
                  },
                  function(object_id, hex_code, hex_code_percent, css3, hue, callback) {
                    db.run(`INSERT INTO colors(painting_id, hex_code, hex_code_percent, css3, hue) VALUES(?,?,?,?,?)`, [object_id, hex_code, hex_code_percent, css3, hue], function(err, result) {
                      if (err) {
                        return console.log(err.message);
                      }
                      // get the last insert id
                      console.log(`A row has been inserted with rowid ${this.lastID}`);
                    })
                    callback(null)
                  },
                ], function (err, result) {
                  if (err) {return console.log('Something is wrong!');}
                  return console.log('Done!');
                })
              }
              callback(null)
            }
          },
        ],
        function (err, result) {
          if (err) {return console.log('Something is wrong!');}
          return console.log('Done!');
        })
      }
    })
    if (data.info.next) {
      loadObjectInfo(data.info.next)
    }
  }
)
};
