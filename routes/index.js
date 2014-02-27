// Connect to MongoDB using Mongoose
var mongoose = require('mongoose');
mongoose.connect('localhost:27017/photo'); 
//var connection = mongoose.connect('mongodb://devphotorg-a01.twhite.aol.com:27017/photo');

mongoose.connection.once('connected', function() {
	console.log("Connected to database");
});
var userSchema = new mongoose.Schema(
		{
			ip:{type:String},
			votes:[]
		}
);
var photoSchema = new mongoose.Schema({
	name:{ type: String, required: true },
	like:{ type: Number,default:0},
	Dislike:{ type: Number,default:0},
	title:{type:String}
});

var db = mongoose.model('db', photoSchema,'photo');
var user = mongoose.model('user',userSchema,'user');

var dbError = {'error':'error','status':500}
, dbNull = {'error':'NO RECORDS','status':404}
, dbDeleteOk = {'status':'OK'};

exports.prefill = function(req,res){
	
var fs = require('fs'),path = require('path');
var photos_on_disk = fs.readdirSync(path.join(__dirname, '../public/photos'));

db.remove({}, function(err) { 
	   console.log('collection removed');
	});
user.remove({},function(err){
	console.log('user collection removed');
});

photos_on_disk.forEach(function(photo){
	var imgPatt = /\.([0-9a-z]+)(?:[\?#]|$)/i;
	var imgTest = (photo).match(imgPatt);
	if (imgTest != null){
	var obj = {
			name: photo,
			likes: 0,
			dislikes: 0,
			title:'title for: '+photo
		};
	var newDbModel = new db(obj);
	newDbModel.save(function(error,data){
		  //console.log(data);
		  if(error){
			  res.send(dbError);
		  }else{
			  
		    }
	  });
	}
});


var userSet = {"ip":"127.0.0.1","votes":[]};

	var newDbModel = new user(userSet);
	newDbModel.save(function(error,data){
		console.log(data);
	});
  res.json(dbDeleteOk);
}

	
exports.getPoll = function(req,res)
{
	//console.log(req.ip + "---");
	db.find({}, function(err, all_photos){

		// Find the current user
		user.find({ip: ''}, function(err, u){

			var voted_on = [];

			if(u.length == 1){
				voted_on = u[0].votes;
			}

			// Find which photos the user hasn't still voted on

			var not_voted_on = all_photos.filter(function(photo){
				return voted_on.indexOf(photo._id) == -1;
			});

			var image_to_show = null;

			if(not_voted_on.length > 0){
				// Choose a random image from the array
				image_to_show = not_voted_on[Math.floor(Math.random()*not_voted_on.length)];
			}
res.json(image_to_show);	
		});

	});
};	

// Main application view
exports.index = function(req, res) {
	res.render('home',{ title: 'Voting App'});
};


exports.allPolls = function(req, res){

	db.find({}, function(err, all_photos){

		// Sort the photos 

		all_photos.sort(function(p1, p2){
			return (p2.like - p2.Dislike) - (p1.like - p1.Dislike);
		});
		res.json(all_photos);

	});
}

exports.getPollId = function(req, res){

	db.findById({_id:req.params.id}, function(err, photo){

		res.send(photo);

	});
}
exports.vote = function(io) {
	//io.socket.on('send:vote', function(data) {
		//var ip = io.handshake.headers['x-forwarded-for'] || io.handshake.address.address;
	return function(req,res){	
		//var ip = io.handshake.headers['x-forwarded-for'] || io.handshake.address.address;
	//console.log(io);
		console.log(req.body.type);
		var what = {
				'Dislike': {Dislike:1},
				'like': {like:1}
			};
		var likeCount = 0,DislikeCount=0;
		var thDoc = {vote:false,type:'',count:'',name:'',id:'',likeCount:'',DislikeCount:'',title:''};
		db.find({ _id: req.body.id }, function(err, found){

			if(found.length == 1){
				
				db.update(found[0], {$inc : what[req.body.type]},function(err,num,n){
					console.log(num);
					
				});
				likeCount = found[0].like;
				DislikeCount = found[0].Dislike;
				if(req.body.type == "like") likeCount = likeCount+1;
				if(req.body.type == "Dislike") DislikeCount = DislikeCount+1;
				console.log(likeCount+DislikeCount);
				var ip = ''; //req.ip
				user.update({ip: ''}, { $addToSet: { votes: found[0]._id}}, function(){
						thDoc.name = found[0].name;
						thDoc.type = req.body.type;
						thDoc.vote = true;
						thDoc.count = likeCount + DislikeCount;
						thDoc.likeCount = likeCount;
						thDoc.DislikeCount = DislikeCount;
						thDoc.id = found[0]._id;
						thDoc.title = found[0].title;
					
					console.log(thDoc);
					io.sockets.emit('notification', thDoc);
					res.json(thDoc);
				});

			}
			else{
				//res.redirect('../');
			}

		});
	}
};