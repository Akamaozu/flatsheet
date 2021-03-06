var response = require('response');
var JSONStream = require('JSONStream');
var jsonBody = require('body/json');
var formBody = require('body/form');
var Busboy = require('busboy');
var csv = require('csv-parser');

var auth = require('../util/check-auth');

exports.install = function (server, prefix) {
  var prefix = prefix || '/sheet';

  server.route(prefix + '/list', function (req, res, opts) {
    if (auth(res, { prefix: prefix, id: opts.params.id })) {
      
      server.sheets.list(function (err, list) {
        if (err) console.log(err);
        var ctx = { account: res.account, sheets: list };
        return response().html(server.render('sheet-list', ctx)).pipe(res);
      });
      
    }
  });

  server.route(prefix + '/edit/:id', function (req, res, opts) {
    if (auth(res, { prefix: prefix, id: opts.params.id })) {

      server.sheets.fetch(opts.params.id, function (err, sheet) {
        if (err) {
          res.writeHead(302, { 'Location': '/' });
          return res.end();
        }

        var ctx = { account: res.account, sheet: sheet };
        return response().html(server.render('sheet-edit', ctx)).pipe(res);
      });
      
    }
  });

  server.route(prefix + '/view/:id', function (req, res, opts) {
    server.sheets.fetch(opts.params.id, function (err, sheet) {
      if (err) {
        res.writeHead(302, { 'Location': '/' });
        return res.end();
      }

      var headers = [];

      sheet.rows.forEach(function (row) {
        Object.keys(row).forEach( function (name) {
          if (headers.indexOf(name) < 0) headers.push(name);
        });
      });

      var ctx = { account: res.account, sheet: sheet, headers: headers };
      return response().html(server.render('sheet-view', ctx)).pipe(res);
    });
  });

  server.route(prefix + '/new', function (req, res, opts) {
    if (auth(res, { prefix: prefix, id: opts.params.id })) {

      formBody(req, res, function (err, body) {
        var data = body;
        data.rows = 
        server.sheets.create(data, function (err, sheet, token) {
          if (err) console.error(err);
          res.writeHead(302, { 'Location': '/sheet/edit/' + token });
          return res.end();
        })
      });
      
    };
  });

  server.route(prefix + '/new/csv', function (req, res, opts) {
    if (auth(res, { prefix: prefix, id: opts.params.id })) {
      var sheet = { rows: [] };
      
      var busboy = new Busboy({ headers: req.headers });
      
      busboy.on('file', function (fieldname, file, filename, enc, mime) {
        file.pipe(csv()).on('data', function (data) {
          sheet.rows.push(data);
        });
      });
      
      busboy.on('field', function(fieldname, val) {
        sheet[fieldname] = val
      });
      
      busboy.on('finish', function() {
        if (!sheet.name) sheet.name = 'New sheet';
        if (!sheet.description) sheet.description = 'A cool new sheet.';
        
        server.sheets.create(sheet, function (err, sheet, token) {
          if (err) console.error(err);
          res.writeHead(302, { 'Location': '/sheet/edit/' + token });
          return res.end();
        })
      });

      req.pipe(busboy);
    };
  });
  
  server.route(prefix + '/destroy/:id', function (req, res, opts) {
    if (auth(res, { prefix: prefix, id: opts.params.id })) {
      server.sheets.destroy(opts.params.id, function (err) {
        if (err) console.error(err);
        res.writeHead(302, { 'Location': '/' });
        return res.end();
      });
      
    }
  });
  
  
  /*
  * backwards campatibility for old sheet route
  */
  
  server.route(prefix + '/:id', function (req, res, opts) {
    res.writeHead(302, { 'Location': prefix + '/edit/' + opts.params.id });
    return res.end();
  });
}


