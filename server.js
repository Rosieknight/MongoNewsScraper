
//Dependancies needed for this program. Just the site itself.
var express = require("express");
var bodyParser = require("body-parser");
var logger = require("morgan"); //Added the morgan package for developmet ease.
var mongoose = require("mongoose");

//The models need to be here in order to track notes and stores, and associate the two.
var Notes = require("./models/Notes.js");
var Stories = require("./models/Stories.js");

//These are the scraping programs. There's nothing to comment on if these aren't here.
var request = require("request");
var cheerio = require("cheerio");

//Mongoose Promises to work.
mongoose.Promise = Promise;

//Start up express. This must go before handlebars.
var app = express();

//Now that express is started, starting up both morgan and body-parser.
app.use(logger("dev"));
app.use(bodyParser.urlencoded({
	extended: false
}));

app.use("./public");

//Stuff handlebars needs goes here.
var exphbs = require("express-handlebars");
app.engine("handlebars", exphbs({ defaultLayout: "main" }));
app.set("view engine", "handlebars");

//Time to start mongoose!
mongoose.connect((process.env.MONGODB_URI ||'mongodb://localhost/bob'));

//The database is accessed through mongoose. Any errors or successes will show that.
var db = mongoose.connection;
db.on("error", function(error){
	console.log("Something went wrong with mongoose! The error is " + error);
});
db.once("open", function(){
	console.log("The mongoose connection is working.");
});

//Routes!
//Now that the database is up and running, the routes are next. I put them in the same
//file for ease of spell checking.

//Start with the scraping. It's a GET request, obviously.
app.get("/scrape", function(req, res){
	request(/*The chosen news site.*/, function(error, response, html){
		var $ = cheerio.load(html); //Might change the $ if it gets too confusing.
		$("article h2").each(function(i, element){
			var result ={};
			//Depending on the names provided by the result object, the below might be
			//be different.
			result.title = $(this).children("a").text();
			result.title = $(this).children("a").attr("href");

			//Whatever the names may be, these are used to create a new entry in the 
			//Stories collection.
			var entry = new Story(result);
			entry.save(function(err, doc){
				if(err){
					console.log("There is an error between the models and database: " + err);
				}
				else{
					console.log("It's working! " + doc);
				}
			});
		});
	});
	//Returs us to the main page after finishing the scraping.
	res.render("/");
});

//Get articles from the database.
app.get("/stories", function(req, res){
	Story.find({}, function(err, doc){
		if(err){
			console.log("There is an error when retrieving from the database: " + err);
		}
		else{
			console.log("It's working! " + doc);
		}
	});
	res.render("/");
});

//Getting a specific article from the database.
app.get("stories/:id", function(req, res){
	Story.findOne({"_id": req.params.id})
	.populate("note")
	.exec(function(err, doc){
		if(err){
			console.log("There is an error retrieving this one from the database: " + err);
		}
		else{
			res.render(doc);
		}
	});
});

//Creates a new note. Also updates an old one.
app.post("/stories/:id", function(req, res){
	var	newNote = new Note(req.body);
	newNote.save(function(err, doc){
		if (err){
			console.log("Something went wrong. Note was not saved. Error: " + err);
		}
		else{
			Story.findOneAndUpdate({"_id": req.params.id}, {"note": doc._id})
			.exec(function(error, doc){
				if(error){
					console.log("Here's the problem. You got an error: " + error);
				}
				else{
					res.send(doc);
				}
			});
		}
	});
});
