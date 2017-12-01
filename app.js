var express = require('express');
var path = require('path');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');

var mysql = require('mysql');
var con = mysql.createConnection({
    host: "jts4.host.cs.st-andrews.ac.uk",
    user: "jts4",
    password: "FerKw58Hkd6Nz.",
    database:'jts4_cs3101_db'
});
con.connect(function(err) {
    if (err) throw err;
    console.log("Connected!");
});

var index = require('./routes/index');

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', index);

// gets main page aka views all audiobooks in the system
app.get('/', function(req, res) {
    var bookList = [];
    con.query("SELECT aud_bk_isbn as isbn, title, publ_date, age_rating, run_time, purchase_price, publ_name, (select surname from Persons where person_id = Audio_Books.person_id) as narrator FROM Audio_Books", function(err, rows, fields) {
        if (err) throw err;
        console.log('Succcesssssfull query');
        for (var i = 0; i < rows.length; i++) {
            var book = {
                'isbn':rows[i].isbn,
                'title':rows[i].title,
                'audio_file':rows[i].audio_file,
                'publ_date':rows[i].publ_date,
                'age_rating':rows[i].age_rating,
                'run_time':rows[i].run_time,
                'purchase_price':rows[i].purchase_price,
                'publ_name':rows[i].publ_name,
                'narrator':rows[i].narrator,
            };
            bookList.push(book);
        }
        res.render('books', {"bookList": bookList});
    });
});

// gets audio books ordered from highest number of purchases to lowest
app.get('/sorted', function(req, res) {
    var sortBooks = [];
    con.query("select aud_bk_isbn, title, publ_date, age_rating, run_time, " +
        "purchase_price, publ_name, (select surname from Persons where person_id = " +
        "Audio_Books.person_id) as narrator, (select count(aud_bk_isbn) from " +
        "Customer_Audio_Books where aud_bk_isbn = Audio_Books.aud_bk_isbn) as count" +
        " from Audio_Books group by aud_bk_isbn order by count desc", function(err, rows, fields) {
        if (err) throw err;
        console.log('Succcesssssfull query');
        for (var i = 0; i < rows.length; i++) {
            var book = {
                'isbn':rows[i].aud_bk_isbn,
                'title':rows[i].title,
                'publ_date':rows[i].publ_date,
                'age_rating':rows[i].age_rating,
                'run_time':rows[i].run_time,
                'purchase_price':rows[i].purchase_price,
                'publ_name':rows[i].publ_name,
                'narrator':rows[i].narrator,
                'times_purchased':rows[i].count
            };
            sortBooks.push(book);
        }
        res.render('books', {"bookList": sortBooks});
    });
});

// gets all audiobooks written by each author
app.get('/authors', function(req, res) {
    var authBooks = [];
    con.query("select Persons.forename, Persons.surname, Audio_Books.aud_bk_isbn, Audio_Books.title, Audio_Books.publ_date, Audio_Books.age_rating, Audio_Books.run_time, Audio_Books.purchase_price, Audio_Books.publ_name, (select surname from Persons where person_id = Audio_Books.person_id) as narrator from Audio_Book_Authors, Audio_Books, Persons where Audio_Books.aud_bk_isbn = Audio_Book_Authors.aud_bk_isbn and Persons.person_id = Audio_Book_Authors.person_id order by Audio_Book_Authors.person_id", function(err, rows, fields) {
        if (err) throw err;
        console.log('Succcesssssfull query');
        for (var i = 0; i < rows.length; i++) {
            var book = {
                'authFor':rows[i].forename,
                'authSur':rows[i].surname,
                'isbn':rows[i].aud_bk_isbn,
                'title':rows[i].title,
                'publ_date':rows[i].publ_date,
                'age_rating':rows[i].age_rating,
                'run_time':rows[i].run_time,
                'purchase_price':rows[i].purchase_price,
                'publ_name':rows[i].publ_name,
                'narrator':rows[i].narrator
            };
            authBooks.push(book);
        }
        res.render('authors', {"bookList": authBooks});
    });
});

// gets all reviews for any and all audiobooks
app.get('/reviews', function(req, res) {
    var reviewsList = [];
    con.query("select Audio_Books.title, Reviews.rating, Reviews.text_comment, Persons.forename, Persons.surname from Reviews, Audio_Books, Persons where Audio_Books.aud_bk_isbn = Reviews.aud_bk_isbn AND Persons.person_id = Reviews.person_id", function(err, rows, fields) {
        if (err) throw err;
        console.log('Succcesssssfull query');
        for (var i = 0; i < rows.length; i++) {
            var review = {
                'title':rows[i].title,
                'rating':rows[i].rating,
                'comment':rows[i].text_comment,
                'custFor':rows[i].forename,
            };
            reviewsList.push(review);
        }
        res.render('reviews', {"reviewsList": reviewsList});
    });
});


app.get('/node/:id/:isbn', function(req, res, next) {
    res.render('index', {title: 'Made It', id: req.params.id, isbn: req.params.isbn});
});

app.post('/purchase', function(req, res, next) {
    var id = req.body.idInput;
    var isbn = req.body.isbn;
    console.log("is this doing anything");
    con.query("INSERT INTO Customer_Audio_Books"
        +" VALUES (" +id +", " +isbn +", "
        +"NOW())", function(err, rows, fields) {
        if (err) throw err;
        console.log('Succcesssssfull query');
    });
    res.redirect('/node/' +id +'/' +isbn);
});

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
