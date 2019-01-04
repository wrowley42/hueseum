'use strict';

module.exports = (req, res, next) => {
  if(!req.user) req.user = {};
  if(!req.user.recentColors) {
    req.user.recentColors = [];
  }

  next();
}
